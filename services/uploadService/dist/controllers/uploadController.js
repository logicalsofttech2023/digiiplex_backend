import { CompleteMultipartUploadCommand, CreateMultipartUploadCommand, DeleteObjectsCommand, ListObjectsV2Command, PutObjectCommand, UploadPartCommand, } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { and, desc, eq } from "drizzle-orm";
// import { db } from "../config/db.js";
import { s3 } from "../config/s3.js";
import { HTTP_STATUS, S3_CREDENTIAL } from "../constants/constant.js";
import { videoQueue } from "../config/queue.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { buildS3FileUrl, buildCdnFileUrl, buildOriginalVideoKey, buildOriginalThumbnailKey, buildProcessingPrefix, } from "../utils/storagePath.js";
import { db, uploads, uploadAssets, uploadSessions, genres, Users } from "@digiiplex6112/db";
// ─────────────────────────────────────────────
// HELPER: Resolve StoragePathContext from DB
// ─────────────────────────────────────────────
const resolveStorageContext = async (creatorId, uploadId, title, type, genreId) => {
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
    return {
        creatorEmail: user.email,
        category: type ?? "uncategorized",
        genreName,
        movieTitle: title,
        uploadId,
    };
};
// ─────────────────────────────────────────────
// HELPER: Initiate multipart upload on S3
// ─────────────────────────────────────────────
const initiateMultipartUpload = async (ctx, assetRole) => {
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
// ─────────────────────────────────────────────
// HELPER: Create thumbnail presigned URL
// ─────────────────────────────────────────────
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
// ─────────────────────────────────────────────
// CONTROLLER: Initialize Upload
// ─────────────────────────────────────────────
export const createUpload = asyncHandler(async (req, res) => {
    const { title, description, type, genreId, languageId, defaultLanguage, metadata } = req.body;
    const creatorId = req.user?.id;
    if (!creatorId)
        throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Unauthorized");
    if (!title)
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Title is required");
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
        status: "INITIATED",
        metadata: metadata ?? {},
    })
        .returning();
    // 2. Resolve storage context (email + genre name from DB)
    const ctx = await resolveStorageContext(creatorId, upload.id, title, type ?? null, genreId ?? null);
    // 3. Initiate S3 uploads
    const [videoUpload, trailerUpload, thumbnailUpload] = await Promise.all([
        initiateMultipartUpload(ctx, "MAIN"),
        initiateMultipartUpload(ctx, "TRAILER"),
        initiateThumbnailUpload(ctx),
    ]);
    // 4. Insert uploadAssets
    await db.insert(uploadAssets).values([
        { uploadId: upload.id, assetType: "VIDEO", assetRole: "MAIN", fileKey: videoUpload.key, status: "PENDING_UPLOAD" },
        { uploadId: upload.id, assetType: "VIDEO", assetRole: "TRAILER", fileKey: trailerUpload.key, status: "PENDING_UPLOAD" },
        { uploadId: upload.id, assetType: "IMAGE", assetRole: "THUMBNAIL", fileKey: thumbnailUpload.key, status: "PENDING_UPLOAD" },
    ]);
    // 5. Create upload sessions for multipart uploads
    const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.insert(uploadSessions).values([
        { uploadId: upload.id, userId: creatorId, fileKey: videoUpload.key, expiresAt: sessionExpiresAt },
        { uploadId: upload.id, userId: creatorId, fileKey: trailerUpload.key, expiresAt: sessionExpiresAt },
    ]);
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Upload initialized", {
        uploadId: upload.id,
        upload: {
            video: { s3UploadId: videoUpload.s3UploadId, key: videoUpload.key },
            trailer: { s3UploadId: trailerUpload.s3UploadId, key: trailerUpload.key },
            thumbnail: { presignedUrl: thumbnailUpload.presignedUrl, fileUrl: thumbnailUpload.fileUrl, key: thumbnailUpload.key },
        },
    }));
});
// ─────────────────────────────────────────────
// CONTROLLER: Get Multipart Signed URL (per chunk)
// ─────────────────────────────────────────────
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
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Signed URL generated", { url }));
});
// ─────────────────────────────────────────────
// CONTROLLER: Complete Multipart Upload
// ─────────────────────────────────────────────
export const completeMultipartUpload = asyncHandler(async (req, res) => {
    const { key, s3UploadId, parts, uploadId, assetRole } = req.body;
    if (!key || !s3UploadId || !parts || !uploadId || !assetRole) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "key, s3UploadId, parts, uploadId and assetRole are required");
    }
    // 1. Fetch upload
    const upload = await db.query.uploads.findFirst({ where: eq(uploads.id, uploadId) });
    if (!upload)
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Upload not found");
    // 2. Complete S3 multipart
    await s3.send(new CompleteMultipartUploadCommand({
        Bucket: S3_CREDENTIAL.S3_BUCKET,
        Key: key,
        UploadId: s3UploadId,
        MultipartUpload: { Parts: parts },
    }));
    const fileUrl = buildS3FileUrl(key);
    // 3. Resolve processing prefix for worker
    const ctx = await resolveStorageContext(upload.creatorId, upload.id, upload.title, upload.type ?? null, upload.genreId ?? null);
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
    await db.update(uploads).set({ status: "IN_REVIEW", updatedAt: new Date() }).where(eq(uploads.id, uploadId));
    // 6. Enqueue transcoding job (pass processingPrefix so worker doesn't need to recompute)
    const queueJob = await videoQueue.add("convert-to-hls", { fileUrl, uploadId, uploadAssetId: updatedAsset.id, sourceKey: key, assetRole, processingPrefix }, { jobId: `${uploadId}:${assetRole}:${Date.now()}`, priority: assetRole === "MAIN" ? 1 : 5 });
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Upload complete, transcoding queued", {
        fileUrl,
        jobId: queueJob.id,
        uploadAssetId: updatedAsset.id,
        processingPrefix,
    }));
});
// ─────────────────────────────────────────────
// CONTROLLER: Save Thumbnail
// ─────────────────────────────────────────────
export const saveThumbnail = asyncHandler(async (req, res) => {
    const { uploadId, thumbnailUrl } = req.body;
    if (!uploadId || !thumbnailUrl) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "uploadId and thumbnailUrl are required");
    }
    const [updatedAsset] = await db
        .update(uploadAssets)
        .set({ status: "UPLOADED", masterPlaylistUrl: thumbnailUrl, updatedAt: new Date() })
        .where(and(eq(uploadAssets.uploadId, uploadId), eq(uploadAssets.assetRole, "THUMBNAIL")))
        .returning();
    if (!updatedAsset)
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Thumbnail asset not found");
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Thumbnail saved", { asset: updatedAsset }));
});
// ─────────────────────────────────────────────
// CONTROLLER: Get Processing Status
// ─────────────────────────────────────────────
export const getProcessingStatus = asyncHandler(async (req, res) => {
    const { uploadId, assetRole } = req.params;
    const requestedJobId = typeof req.query.jobId === "string" ? req.query.jobId : undefined;
    const job = (requestedJobId ? await videoQueue.getJob(requestedJobId) : null) ??
        (await videoQueue.getJobs(["active", "waiting", "delayed", "prioritized", "completed", "failed"]))
            .filter((j) => j.data.uploadId === uploadId && j.data.assetRole === assetRole)
            .sort((a, b) => b.timestamp - a.timestamp)[0];
    if (!job) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(new ApiResponse(HTTP_STATUS.NOT_FOUND, "Job not found", null));
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
// ─────────────────────────────────────────────
// CONTROLLER: Delete Upload (with S3 cleanup)
// ─────────────────────────────────────────────
export const deleteUpload = asyncHandler(async (req, res) => {
    const uploadId = typeof req.query.uploadId === "string" ? req.query.uploadId : undefined;
    if (!uploadId)
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "uploadId is required");
    const upload = await db.query.uploads.findFirst({ where: eq(uploads.id, uploadId) });
    if (!upload)
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Upload not found");
    // Build S3 prefixes and delete both Original + Processing folders
    const ctx = await resolveStorageContext(upload.creatorId, upload.id, upload.title, upload.type ?? null, upload.genreId ?? null);
    await Promise.all([
        deleteFolderByPrefix(buildProcessingPrefix(ctx, "MAIN").replace("/MAIN", "/")),
        deleteFolderByPrefix(buildOriginalVideoKey(ctx, "MAIN").replace(/MAIN\/.*$/, "")),
    ]);
    // Soft delete
    await db.update(uploads).set({ deletedFlg: true, status: "CANCELLED", updatedAt: new Date() }).where(eq(uploads.id, uploadId));
    await db.update(uploadAssets).set({ deletedFlg: true, updatedAt: new Date() }).where(eq(uploadAssets.uploadId, uploadId));
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Upload and files deleted successfully", {}));
});
// ─────────────────────────────────────────────
// CONTROLLER: Get Upload By ID
// ─────────────────────────────────────────────
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
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Upload fetched", { upload: { ...upload, assets } }));
});
// ─────────────────────────────────────────────
// CONTROLLER: Get All Uploads (for creator)
// ─────────────────────────────────────────────
export const getAllUploads = asyncHandler(async (req, res) => {
    const creatorId = req.user?.id;
    if (!creatorId)
        throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Unauthorized");
    const uploadRows = await db
        .select()
        .from(uploads)
        .where(and(eq(uploads.creatorId, creatorId), eq(uploads.deletedFlg, false)))
        .orderBy(desc(uploads.createdAt));
    const result = await Promise.all(uploadRows.map(async (upload) => {
        const assets = await db
            .select()
            .from(uploadAssets)
            .where(and(eq(uploadAssets.uploadId, upload.id), eq(uploadAssets.deletedFlg, false)));
        return { ...upload, assets };
    }));
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Uploads fetched", { uploads: result }));
});
// ─────────────────────────────────────────────
// UTIL: Delete S3 folder by prefix
// ─────────────────────────────────────────────
const deleteFolderByPrefix = async (prefix) => {
    let continuationToken;
    do {
        const listed = await s3.send(new ListObjectsV2Command({ Bucket: S3_CREDENTIAL.S3_BUCKET, Prefix: prefix, ContinuationToken: continuationToken }));
        if (listed.Contents?.length) {
            await s3.send(new DeleteObjectsCommand({
                Bucket: S3_CREDENTIAL.S3_BUCKET,
                Delete: {
                    Objects: listed.Contents
                        .map((item) => item.Key)
                        .filter((k) => Boolean(k))
                        .map((k) => ({ Key: k })),
                },
            }));
        }
        continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
    } while (continuationToken);
};
//# sourceMappingURL=uploadController.js.map