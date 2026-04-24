import { CompleteMultipartUploadCommand, CreateMultipartUploadCommand, DeleteObjectsCommand, ListObjectsV2Command, PutObjectCommand, UploadPartCommand, } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { and, desc, eq, inArray } from "drizzle-orm";
// import { db } from "../config/db.js";
import { s3 } from "../config/s3.js";
import { HTTP_STATUS, S3_CREDENTIAL } from "../constants/constant.js";
import { videoQueue } from "../config/queue.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { buildS3FileUrl, buildCdnFileUrl, buildOriginalVideoKey, buildOriginalAudioKey, buildOriginalThumbnailKey, buildProcessingPrefix, } from "../utils/storagePath.js";
import { db, uploads, uploadAssets, uploadSessions, genres, Users, shows, } from "@digiiplex6112/db";
const AUDIO_ONLY_KINDS = ["MUSIC_TRACK"];
const HAS_TRAILER = ["MOVIE", "SHORT", "STANDUP"];
const REQUIRES_SHOW = ["EPISODE", "PODCAST_EP", "MUSIC_TRACK"];
const isAudioOnly = (kind) => AUDIO_ONLY_KINDS.includes(kind);
const resolveStorageContext = async (creatorId, uploadId, title, type, genreId, showId, seasonNumber, episodeNumber) => {
    const user = await db.query.Users.findFirst({
        where: eq(Users.id, creatorId),
        columns: { email: true },
    });
    if (!user)
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Creator not found");
    let genreName = "general";
    if (genreId) {
        const genre = await db.query.genres.findFirst({
            where: eq(genres.id, genreId),
            columns: { name: true },
        });
        if (genre)
            genreName = genre.name;
    }
    let resolvedTitle = title;
    if (showId) {
        const show = await db.query.shows.findFirst({
            where: eq(shows.id, showId),
            columns: { title: true },
        });
        if (show)
            resolvedTitle = show.title;
    }
    return {
        creatorEmail: user.email,
        category: type ?? "uncategorized",
        genreName,
        movieTitle: resolvedTitle,
        uploadId,
        showId: showId ?? null,
        seasonNumber: seasonNumber ?? null,
        episodeNumber: episodeNumber ?? null,
    };
};
const initiateVideoMultipart = async (ctx, assetRole) => {
    const key = buildOriginalVideoKey(ctx, assetRole);
    const command = new CreateMultipartUploadCommand({
        Bucket: S3_CREDENTIAL.S3_BUCKET,
        Key: key,
        ContentType: "video/mp4",
        ACL: "public-read",
    });
    const response = await s3.send(command);
    return { s3UploadId: response.UploadId, key };
};
const initiateAudioMultipart = async (ctx) => {
    const key = buildOriginalAudioKey(ctx);
    const command = new CreateMultipartUploadCommand({
        Bucket: S3_CREDENTIAL.S3_BUCKET,
        Key: key,
        ContentType: "audio/mpeg",
        ACL: "public-read",
    });
    const response = await s3.send(command);
    return { s3UploadId: response.UploadId, key };
};
const initiateThumbnailUpload = async (ctx) => {
    const key = buildOriginalThumbnailKey(ctx);
    const command = new PutObjectCommand({
        Bucket: S3_CREDENTIAL.S3_BUCKET,
        Key: key,
        ContentType: "image/jpeg",
        ACL: "public-read",
    });
    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3000 });
    return { presignedUrl, fileUrl: buildCdnFileUrl(key), key };
};
const deleteFolderByPrefix = async (prefix) => {
    let continuationToken;
    do {
        const listed = await s3.send(new ListObjectsV2Command({
            Bucket: S3_CREDENTIAL.S3_BUCKET,
            Prefix: prefix,
            ContinuationToken: continuationToken,
        }));
        if (listed.Contents?.length) {
            await s3.send(new DeleteObjectsCommand({
                Bucket: S3_CREDENTIAL.S3_BUCKET,
                Delete: {
                    Objects: listed.Contents.map((item) => item.Key)
                        .filter((k) => Boolean(k))
                        .map((k) => ({ Key: k })),
                },
            }));
        }
        continuationToken = listed.IsTruncated
            ? listed.NextContinuationToken
            : undefined;
    } while (continuationToken);
};
// ─────────────────────────────────────────────
// CONTROLLER: Initialize Upload
// ─────────────────────────────────────────────
export const createShow = asyncHandler(async (req, res) => {
    const { title, description, type, genreId, languageId, defaultLanguage, totalSeasons, metadata, } = req.body;
    const creatorId = req.user?.id;
    if (!creatorId)
        throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Unauthorized");
    if (!title)
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Title is required");
    if (!type)
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Show type is required");
    const [show] = await db
        .insert(shows)
        .values({
        creatorId,
        title,
        description: description ?? null,
        type,
        genreId: genreId ?? null,
        languageId: languageId ?? null,
        defaultLanguage: defaultLanguage ?? null,
        totalSeasons: totalSeasons ?? 1,
        status: "DRAFT",
        metadata: metadata ?? {},
    })
        .returning();
    return res
        .status(HTTP_STATUS.OK)
        .json(new ApiResponse(HTTP_STATUS.OK, "Show created", { show }));
});
export const getShowById = asyncHandler(async (req, res) => {
    const showId = req.params.id;
    if (!showId)
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "showId is required");
    const show = await db.query.shows.findFirst({
        where: and(eq(shows.id, showId), eq(shows.deletedFlg, false)),
    });
    if (!show)
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Show not found");
    const episodes = await db
        .select()
        .from(uploads)
        .where(and(eq(uploads.showId, showId), eq(uploads.deletedFlg, false)))
        .orderBy(uploads.seasonNumber, uploads.episodeNumber);
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Show fetched", {
        show: { ...show, episodes },
    }));
});
export const getAllShows = asyncHandler(async (req, res) => {
    const creatorId = req.user?.id;
    if (!creatorId)
        throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Unauthorized");
    const allShows = await db
        .select()
        .from(shows)
        .where(and(eq(shows.creatorId, creatorId), eq(shows.deletedFlg, false)))
        .orderBy(desc(shows.createdAt));
    return res
        .status(HTTP_STATUS.OK)
        .json(new ApiResponse(HTTP_STATUS.OK, "Shows fetched", { shows: allShows }));
});
export const createUpload = asyncHandler(async (req, res) => {
    const { title, description, type, genreId, languageId, defaultLanguage, metadata, contentKind, showId, seasonNumber, episodeNumber, } = req.body;
    const creatorId = req.user?.id;
    if (!creatorId)
        throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Unauthorized");
    if (!title)
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Title is required");
    if (!contentKind)
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "contentKind is required");
    const kind = contentKind;
    if (REQUIRES_SHOW.includes(kind) && !showId) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, `showId is required for ${kind}`);
    }
    if (showId) {
        const show = await db.query.shows.findFirst({
            where: eq(shows.id, showId),
        });
        if (!show)
            throw new ApiError(HTTP_STATUS.NOT_FOUND, "Show not found");
    }
    // 1. Create upload record
    const [upload] = await db
        .insert(uploads)
        .values({
        creatorId,
        title,
        description: description ?? null,
        type: type ?? null,
        genreId: genreId ?? null,
        languageId: languageId ?? null,
        defaultLanguage: defaultLanguage ?? null,
        contentKind: kind,
        showId: showId ?? null,
        seasonNumber: seasonNumber ?? null,
        episodeNumber: episodeNumber ?? null,
        status: "INITIATED",
        metadata: metadata ?? {},
    })
        .returning();
    const ctx = await resolveStorageContext(creatorId, upload.id, title, type ?? null, genreId ?? null, showId ?? null, seasonNumber ?? null, episodeNumber ?? null);
    const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (isAudioOnly(kind)) {
        const audioUpload = await initiateAudioMultipart(ctx);
        const coverArt = await initiateThumbnailUpload(ctx);
        await db.insert(uploadAssets).values([
            {
                uploadId: upload.id,
                assetType: "AUDIO",
                assetRole: "MAIN",
                fileKey: audioUpload.key,
                status: "PENDING_UPLOAD",
            },
            {
                uploadId: upload.id,
                assetType: "IMAGE",
                assetRole: "THUMBNAIL",
                fileKey: coverArt.key,
                status: "PENDING_UPLOAD",
            },
        ]);
        await db.insert(uploadSessions).values([
            {
                uploadId: upload.id,
                userId: creatorId,
                fileKey: audioUpload.key,
                expiresAt: sessionExpiresAt,
            },
        ]);
        return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Upload initialized", {
            uploadId: upload.id,
            contentKind: kind,
            upload: {
                audio: {
                    s3UploadId: audioUpload.s3UploadId,
                    key: audioUpload.key,
                },
                coverArt: {
                    presignedUrl: coverArt.presignedUrl,
                    fileUrl: coverArt.fileUrl,
                    key: coverArt.key,
                },
            },
        }));
    }
    const mainUpload = await initiateVideoMultipart(ctx, "MAIN");
    const thumbnailUpload = await initiateThumbnailUpload(ctx);
    const assetValues = [
        {
            uploadId: upload.id,
            assetType: "VIDEO",
            assetRole: "MAIN",
            fileKey: mainUpload.key,
            status: "PENDING_UPLOAD",
        },
        {
            uploadId: upload.id,
            assetType: "IMAGE",
            assetRole: "THUMBNAIL",
            fileKey: thumbnailUpload.key,
            status: "PENDING_UPLOAD",
        },
    ];
    const sessionValues = [
        {
            uploadId: upload.id,
            userId: creatorId,
            fileKey: mainUpload.key,
            expiresAt: sessionExpiresAt,
        },
    ];
    // Trailer only for MOVIE, SHORT, STANDUP
    let trailerUpload = null;
    if (HAS_TRAILER.includes(kind)) {
        trailerUpload = await initiateVideoMultipart(ctx, "TRAILER");
        assetValues.push({
            uploadId: upload.id,
            assetType: "VIDEO",
            assetRole: "TRAILER",
            fileKey: trailerUpload.key,
            status: "PENDING_UPLOAD",
        });
        sessionValues.push({
            uploadId: upload.id,
            userId: creatorId,
            fileKey: trailerUpload.key,
            expiresAt: sessionExpiresAt,
        });
    }
    await db.insert(uploadAssets).values(assetValues);
    await db.insert(uploadSessions).values(sessionValues);
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Upload initialized", {
        uploadId: upload.id,
        contentKind: kind,
        upload: {
            video: {
                s3UploadId: mainUpload.s3UploadId,
                key: mainUpload.key,
            },
            ...(trailerUpload && {
                trailer: {
                    s3UploadId: trailerUpload.s3UploadId,
                    key: trailerUpload.key,
                },
            }),
            thumbnail: {
                presignedUrl: thumbnailUpload.presignedUrl,
                fileUrl: thumbnailUpload.fileUrl,
                key: thumbnailUpload.key,
            },
        },
    }));
});
export const getMultipartSignedUrl = asyncHandler(async (req, res) => {
    const { key, s3UploadId, partNumber } = req.body;
    if (!key || !s3UploadId || !partNumber) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "key, s3UploadId and partNumber are required");
    }
    const command = new UploadPartCommand({
        Bucket: S3_CREDENTIAL.S3_BUCKET,
        Key: key,
        UploadId: s3UploadId,
        PartNumber: Number(partNumber),
    });
    const url = await getSignedUrl(s3, command, { expiresIn: 3000 });
    return res
        .status(HTTP_STATUS.OK)
        .json(new ApiResponse(HTTP_STATUS.OK, "Signed URL generated", { url }));
});
export const completeMultipartUpload = asyncHandler(async (req, res) => {
    const { key, s3UploadId, parts, uploadId, assetRole } = req.body;
    if (!key || !s3UploadId || !parts || !uploadId || !assetRole) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "key, s3UploadId, parts, uploadId and assetRole are required");
    }
    // 1. Fetch upload
    const upload = await db.query.uploads.findFirst({
        where: eq(uploads.id, uploadId),
    });
    if (!upload)
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Upload not found");
    const kind = (upload.contentKind ?? "MOVIE");
    // 2. Complete S3 multipart
    await s3.send(new CompleteMultipartUploadCommand({
        Bucket: S3_CREDENTIAL.S3_BUCKET,
        Key: key,
        UploadId: s3UploadId,
        MultipartUpload: { Parts: parts },
    }));
    const fileUrl = buildS3FileUrl(key);
    // 3. Resolve processing prefix for worker
    const ctx = await resolveStorageContext(upload.creatorId, upload.id, upload.title, upload.type ?? null, upload.genreId ?? null, upload.showId ?? null, upload.seasonNumber ?? null, upload.episodeNumber ?? null);
    const processingPrefix = buildProcessingPrefix(ctx, assetRole);
    // 4. Update uploadAsset → UPLOADED
    const [updatedAsset] = await db
        .update(uploadAssets)
        .set({ status: "UPLOADED", updatedAt: new Date() })
        .where(and(eq(uploadAssets.uploadId, uploadId), eq(uploadAssets.assetRole, assetRole)))
        .returning();
    if (!updatedAsset)
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Upload asset record not found");
    // 5. Update upload → IN_REVIEW
    await db
        .update(uploads)
        .set({ status: "IN_REVIEW", updatedAt: new Date() })
        .where(eq(uploads.id, uploadId));
    const jobName = isAudioOnly(kind) ? "convert-audio-hls" : "convert-to-hls";
    // 6. Enqueue transcoding job (pass processingPrefix so worker doesn't need to recompute)
    const queueJob = await videoQueue.add(jobName, {
        fileUrl,
        uploadId,
        uploadAssetId: updatedAsset.id,
        sourceKey: key,
        assetRole,
        processingPrefix,
        contentKind: kind,
        showId: upload.showId ?? null,
        seasonNumber: upload.seasonNumber ?? null,
        episodeNumber: upload.episodeNumber ?? null,
    }, {
        jobId: `${uploadId}:${assetRole}:${Date.now()}`,
        priority: assetRole === "MAIN" ? 1 : 5,
    });
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Upload complete, transcoding queued", {
        fileUrl,
        jobId: queueJob.id,
        uploadAssetId: updatedAsset.id,
        processingPrefix,
        contentKind: kind,
    }));
});
export const saveThumbnail = asyncHandler(async (req, res) => {
    const { uploadId, thumbnailUrl } = req.body;
    if (!uploadId || !thumbnailUrl) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "uploadId and thumbnailUrl are required");
    }
    const [updatedAsset] = await db
        .update(uploadAssets)
        .set({
        status: "UPLOADED",
        masterPlaylistUrl: thumbnailUrl,
        updatedAt: new Date(),
    })
        .where(and(eq(uploadAssets.uploadId, uploadId), eq(uploadAssets.assetRole, "THUMBNAIL")))
        .returning();
    if (!updatedAsset)
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Thumbnail asset not found");
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Thumbnail saved", {
        asset: updatedAsset,
    }));
});
export const getProcessingStatus = asyncHandler(async (req, res) => {
    const { uploadId, assetRole } = req.params;
    const requestedJobId = typeof req.query.jobId === "string" ? req.query.jobId : undefined;
    const job = (requestedJobId ? await videoQueue.getJob(requestedJobId) : null) ??
        (await videoQueue.getJobs([
            "active",
            "waiting",
            "delayed",
            "prioritized",
            "completed",
            "failed",
        ]))
            .filter((j) => j.data.uploadId === uploadId && j.data.assetRole === assetRole)
            .sort((a, b) => b.timestamp - a.timestamp)[0];
    if (!job) {
        return res
            .status(HTTP_STATUS.NOT_FOUND)
            .json(new ApiResponse(HTTP_STATUS.NOT_FOUND, "Job not found", null));
    }
    const state = await job.getState();
    const progress = job.progress;
    const progressData = typeof progress === "object" && progress !== null
        ? progress
        : { stage: state, percent: progress ?? 0 };
    const asset = await db.query.uploadAssets.findFirst({
        where: and(eq(uploadAssets.uploadId, uploadId), eq(uploadAssets.assetRole, assetRole)),
    });
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Status fetched", {
        jobId: job.id,
        state,
        progress: progressData,
        failedReason: state === "failed" ? job.failedReason : undefined,
        assetStatus: asset?.status ?? null,
        masterPlaylistUrl: asset?.masterPlaylistUrl ?? null,
    }));
});
export const deleteUpload = asyncHandler(async (req, res) => {
    const uploadId = typeof req.query.uploadId === "string" ? req.query.uploadId : undefined;
    if (!uploadId)
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "uploadId is required");
    const upload = await db.query.uploads.findFirst({
        where: eq(uploads.id, uploadId),
    });
    if (!upload)
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Upload not found");
    const ctx = await resolveStorageContext(upload.creatorId, upload.id, upload.title, upload.type ?? null, upload.genreId ?? null);
    await Promise.all([
        deleteFolderByPrefix(buildProcessingPrefix(ctx, "MAIN").replace("/MAIN", "/")),
        deleteFolderByPrefix(buildOriginalVideoKey(ctx, "MAIN").replace(/MAIN\/.*$/, "")),
    ]);
    await db
        .update(uploads)
        .set({ deletedFlg: true, status: "CANCELLED", updatedAt: new Date() })
        .where(eq(uploads.id, uploadId));
    await db
        .update(uploadAssets)
        .set({ deletedFlg: true, updatedAt: new Date() })
        .where(eq(uploadAssets.uploadId, uploadId));
    return res
        .status(HTTP_STATUS.OK)
        .json(new ApiResponse(HTTP_STATUS.OK, "Upload and files deleted successfully", {}));
});
export const getUploadById = asyncHandler(async (req, res) => {
    const uploadId = req.params.id;
    if (!uploadId)
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "uploadId is required");
    const upload = await db.query.uploads.findFirst({
        where: and(eq(uploads.id, uploadId), eq(uploads.deletedFlg, false)),
    });
    if (!upload)
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Upload not found");
    const assets = await db
        .select()
        .from(uploadAssets)
        .where(and(eq(uploadAssets.uploadId, uploadId), eq(uploadAssets.deletedFlg, false)));
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Upload fetched", {
        upload: { ...upload, assets },
    }));
});
export const getAllUploads = asyncHandler(async (req, res) => {
    const creatorId = req.user?.id;
    if (!creatorId)
        throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Unauthorized");
    const { contentKind } = req.query;
    const validKinds = [
        "MOVIE",
        "EPISODE",
        "SHORT",
        "STANDUP",
        "PODCAST_EP",
        "MUSIC_TRACK",
    ];
    const filters = [
        eq(uploads.creatorId, creatorId),
        eq(uploads.deletedFlg, false),
    ];
    if (contentKind) {
        if (!validKinds.includes(contentKind)) {
            throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Invalid contentKind. Must be one of: ${validKinds.join(", ")}`);
        }
        filters.push(eq(uploads.contentKind, contentKind));
    }
    const uploadRows = await db
        .select()
        .from(uploads)
        .where(and(...filters))
        .orderBy(desc(uploads.createdAt));
    if (uploadRows.length === 0) {
        return res
            .status(HTTP_STATUS.OK)
            .json(new ApiResponse(HTTP_STATUS.OK, "Uploads fetched", { uploads: [] }));
    }
    const uploadIds = uploadRows.map((u) => u.id);
    const allAssets = await db
        .select()
        .from(uploadAssets)
        .where(and(inArray(uploadAssets.uploadId, uploadIds), eq(uploadAssets.deletedFlg, false)));
    const assetsByUploadId = allAssets.reduce((acc, asset) => {
        (acc[asset.uploadId] ??= []).push(asset);
        return acc;
    }, {});
    const result = uploadRows.map((upload) => ({
        ...upload,
        assets: assetsByUploadId[upload.id] ?? [],
    }));
    return res
        .status(HTTP_STATUS.OK)
        .json(new ApiResponse(HTTP_STATUS.OK, "Uploads fetched", { uploads: result }));
});
//# sourceMappingURL=uploadController.js.map