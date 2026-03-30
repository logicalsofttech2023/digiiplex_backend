import { CompleteMultipartUploadCommand, CreateMultipartUploadCommand, DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command, PutObjectCommand, UploadPartCommand, } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "../config/db.js";
import { s3 } from "../config/s3.js";
import { HTTP_STATUS, S3_CREDENTIAL } from "../constants/constant.js";
import { videoQueue } from "../config/queue.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { buildS3FileUrl, extractKeyFromUrl } from "../utils/storagePath.js";
export const createMovieUpload = asyncHandler(async (req, res) => {
    const { title, shortDescription, description, slug, genres, language, releaseYear, ageRating, duration, rating, cast, } = req.body;
    if (!title ||
        !description ||
        !slug ||
        !genres ||
        !language ||
        !releaseYear ||
        !duration ||
        !shortDescription ||
        !ageRating ||
        !rating) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "All required fields must be provided");
    }
    const existingMovie = await prisma.movie.findUnique({
        where: { slug },
    });
    if (existingMovie) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Slug already exists");
    }
    const movie = await prisma.movie.create({
        data: {
            title,
            description,
            slug,
            genres,
            language,
            releaseYear: Number(releaseYear),
            duration: Number(duration),
            shortDescription,
            ageRating,
            rating: Number(rating),
            cast: cast && Array.isArray(cast)
                ? {
                    create: cast.map((name) => ({ name })),
                }
                : undefined,
        },
    });
    const createMultipart = async (type) => {
        const key = `CreatorName1/CategoryName/Genre/Original/MovieName/${movie.id}/${type}-${Date.now()}.mp4`;
        const command = new CreateMultipartUploadCommand({
            Bucket: S3_CREDENTIAL.S3_BUCKET,
            Key: key,
            ContentType: "video/mp4",
            ACL: "public-read",
        });
        const response = await s3.send(command);
        return {
            uploadId: response.UploadId,
            key,
        };
    };
    const createThumbnail = async () => {
        const key = `CreatorName1/CategoryName/Genre/Original/MovieName/${movie.id}/thumbnail-${Date.now()}.jpg`;
        const command = new PutObjectCommand({
            Bucket: S3_CREDENTIAL.S3_BUCKET,
            Key: key,
            ContentType: "image/jpeg",
            ACL: "public-read",
        });
        const uploadUrl = await getSignedUrl(s3, command, {
            expiresIn: 3000,
        });
        return {
            uploadUrl,
            fileUrl: buildS3FileUrl(key),
            key,
        };
    };
    const [video, trailer, thumbnail] = await Promise.all([
        createMultipart("video"),
        createMultipart("trailer"),
        createThumbnail(),
    ]);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Upload initialized", {
        movieId: movie.id,
        upload: {
            video,
            trailer,
            thumbnail,
        },
    }));
});
export const getMultipartSignedUrl = asyncHandler(async (req, res) => {
    const { key, uploadId, partNumber } = req.body;
    if (!key || !uploadId || !partNumber) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Missing fields");
    }
    const command = new UploadPartCommand({
        Bucket: S3_CREDENTIAL.S3_BUCKET,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
    });
    const url = await getSignedUrl(s3, command, {
        expiresIn: 3000,
    });
    res.status(HTTP_STATUS.OK).json({ url });
});
export const completeMultipartUpload = asyncHandler(async (req, res) => {
    const { key, uploadId, parts, movieId, type } = req.body;
    if (!key || !uploadId || !parts || !movieId || !type) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Missing fields");
    }
    const command = new CompleteMultipartUploadCommand({
        Bucket: S3_CREDENTIAL.S3_BUCKET,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
            Parts: parts,
        },
    });
    await s3.send(command);
    const fileUrl = buildS3FileUrl(key);
    const updateData = {};
    if (type === "video") {
        updateData.videoUrl = fileUrl;
    }
    if (type === "trailer") {
        updateData.trailerUrl = fileUrl;
    }
    const queueJob = await videoQueue.add("convert-to-hls", {
        videoUrl: fileUrl,
        movieId,
        sourceKey: key,
        assetType: type,
    }, {
        jobId: `${movieId}:${type}:${Date.now()}`,
    });
    const movie = await prisma.movie.update({
        where: { id: movieId },
        data: updateData,
    });
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Upload complete", {
        fileUrl,
        jobId: queueJob.id,
        movie,
    }));
});
export const saveThumbnail = asyncHandler(async (req, res) => {
    const { movieId, thumbnailUrl } = req.body;
    if (!movieId || !thumbnailUrl) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Missing fields");
    }
    const movie = await prisma.movie.update({
        where: { id: movieId },
        data: { thumbnailUrl },
    });
    res
        .status(HTTP_STATUS.OK)
        .json(new ApiResponse(HTTP_STATUS.OK, "Thumbnail saved", movie));
});
// =======================================================
// 5. GET VIDEO PROCESSING STATUS
// =======================================================
export const getVideoProcessingStatus = asyncHandler(async (req, res) => {
    const { movieId, assetType } = req.params;
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
            .filter((j) => j.data.movieId === movieId && j.data.assetType === assetType)
            .sort((a, b) => b.timestamp - a.timestamp)[0];
    if (!job) {
        return res.status(HTTP_STATUS.NOT_FOUND).json(new ApiResponse(HTTP_STATUS.NOT_FOUND, "Job not found", null));
    }
    const state = await job.getState();
    const progress = job.progress;
    const progressData = typeof progress === "object" && progress !== null
        ? progress
        : { stage: state, percent: progress ?? 0 };
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Status fetched", {
        jobId: job.id,
        state,
        progress: progressData,
        failedReason: state === "failed" ? job.failedReason : undefined,
    }));
});
export const deleteMovie = asyncHandler(async (req, res) => {
    const movieId = typeof req.query.movieId === "string" ? req.query.movieId : undefined;
    if (!movieId) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Movie ID is required");
    }
    const movie = await prisma.movie.findUnique({
        where: { id: movieId },
        include: { videos: true },
    });
    if (!movie) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Movie not found");
    }
    // S3 me ek prefix ke andar saare objects delete karna
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
                        Objects: listed.Contents
                            .map((item) => item.Key)
                            .filter((key) => Boolean(key))
                            .map((key) => ({ Key: key })),
                    },
                }));
            }
            continuationToken = listed.IsTruncated
                ? listed.NextContinuationToken
                : undefined;
        } while (continuationToken);
    };
    // Single object delete
    const deleteSingleObject = async (key) => {
        await s3.send(new DeleteObjectCommand({
            Bucket: S3_CREDENTIAL.S3_BUCKET,
            Key: key,
        }));
    };
    const getOriginalPrefixFromProcessingUrl = (url) => {
        if (!url)
            return null;
        const key = extractKeyFromUrl(url);
        if (!key)
            return null;
        const processingFolderPrefix = key
            .replace(/\/[^/]+$/, "/") // last segment (master.m3u8) hata do
            .replace("/Processing/", "/Original/"); // Processing → Original
        return processingFolderPrefix;
    };
    // Processing URL se Processing folder prefix nikalo
    const getProcessingPrefix = (url) => {
        if (!url)
            return null;
        const key = extractKeyFromUrl(url);
        if (!key || !key.includes("/Processing/"))
            return null;
        // "CreatorName/.../Processing/MovieName/{id}/video/" tak ka prefix
        return key.replace(/\/[^/]+$/, "/");
    };
    const deletePromises = [];
    // --- VIDEO (original + processing) ---
    if (movie.videoUrl) {
        const processingPrefix = getProcessingPrefix(movie.videoUrl);
        const originalPrefix = getOriginalPrefixFromProcessingUrl(movie.videoUrl);
        if (processingPrefix) {
            deletePromises.push(deleteFolderByPrefix(processingPrefix));
        }
        if (originalPrefix) {
            // Original folder me sirf is movie ka .mp4 hoga, prefix se delete karo
            deletePromises.push(deleteFolderByPrefix(originalPrefix));
        }
    }
    // --- TRAILER (original + processing) ---
    if (movie.trailerUrl) {
        const processingPrefix = getProcessingPrefix(movie.trailerUrl);
        const originalPrefix = getOriginalPrefixFromProcessingUrl(movie.trailerUrl);
        if (processingPrefix) {
            deletePromises.push(deleteFolderByPrefix(processingPrefix));
        }
        if (originalPrefix) {
            deletePromises.push(deleteFolderByPrefix(originalPrefix));
        }
    }
    // --- THUMBNAIL ---
    if (movie.thumbnailUrl) {
        const key = extractKeyFromUrl(movie.thumbnailUrl);
        if (key) {
            deletePromises.push(deleteSingleObject(key));
        }
    }
    // Saare S3 deletes parallel chalao
    await Promise.all(deletePromises);
    // DB se movie delete (cascade se Cast, Video, VideoQuality sab jayega)
    await prisma.movie.delete({
        where: { id: movieId },
    });
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Movie and files deleted successfully", {}));
});
export const getMovieById = asyncHandler(async (req, res) => {
    const movieId = typeof req.params.id === "string"
        ? req.params.id
        : req.params.id?.[0];
    if (!movieId) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Movie ID is required");
    }
    const movie = await prisma.movie.findUnique({
        where: { id: movieId },
        include: {
            cast: {
                select: {
                    id: true,
                    name: true,
                },
            },
            videos: {
                include: {
                    qualities: {
                        orderBy: { createdAt: "asc" },
                        select: {
                            id: true,
                            quality: true,
                            url: true,
                            bitrate: true,
                        },
                    },
                },
            },
        },
    });
    if (!movie) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Movie not found");
    }
    // 🎯 Separate videos & trailers
    const movieVideos = movie.videos.filter((v) => v.type === "MOVIE");
    const trailers = movie.videos.filter((v) => v.type === "TRAILER");
    const response = {
        ...movie,
        videos: movieVideos,
        trailers,
    };
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Movie fetched successfully", {
        movie: response,
    }));
});
export const getAllMovies = asyncHandler(async (req, res) => {
    const movies = await prisma.movie.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            cast: {
                select: { id: true, name: true },
            },
            videos: {
                include: {
                    qualities: {
                        orderBy: { quality: "asc" }, // 1080p, 360p, 480p, 720p alphabetical
                        select: {
                            id: true,
                            quality: true,
                            url: true,
                            bitrate: true,
                        },
                    },
                },
            },
        },
    });
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Movies fetched", { movies }));
});
export const getMovieBySlug = asyncHandler(async (req, res) => {
    const slug = req.params.slug;
    const movie = await prisma.movie.findUnique({
        where: { slug },
        include: {
            cast: {
                select: {
                    id: true,
                    name: true,
                },
            },
            videos: {
                include: {
                    qualities: {
                        orderBy: { createdAt: "asc" },
                        select: {
                            id: true,
                            quality: true,
                            url: true,
                            bitrate: true,
                        },
                    },
                },
            },
        },
    });
    if (!movie) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Movie not found");
    }
    // 🎯 Separate movie & trailer videos
    const movieVideos = movie.videos.filter((v) => v.type === "MOVIE");
    const trailers = movie.videos.filter((v) => v.type === "TRAILER");
    // 🎯 Clean response (remove raw videos array)
    const response = {
        ...movie,
        videos: movieVideos,
        trailers,
    };
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Movie fetched successfully", {
        movie: response,
    }));
});
//# sourceMappingURL=uploadController.js.map