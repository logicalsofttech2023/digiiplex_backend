import { CompleteMultipartUploadCommand, CreateMultipartUploadCommand, DeleteObjectCommand, DeleteObjectsCommand, ListObjectsV2Command, PutObjectCommand, UploadPartCommand, } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "../config/db.js";
import { s3 } from "../config/s3.js";
import { HTTP_STATUS, S3_CREDENTIAL } from "../constants/constant.js";
import { videoQueue } from "../config/queue.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { buildS3FileUrl, buildCdnFileUrl, extractKeyFromUrl } from "../utils/storagePath.js";
import { casts, movieStatusEnum, movies, videoQualities, videos } from "../db/schema.js";
const getMovieAggregate = async (where, qualityOrder = "createdAt") => {
    const movie = where.id
        ? await db.query.movies.findFirst({ where: eq(movies.id, where.id) })
        : await db.query.movies.findFirst({ where: eq(movies.slug, where.slug ?? "") });
    if (!movie) {
        return null;
    }
    const [castRows, videoRows] = await Promise.all([
        db
            .select({ id: casts.id, name: casts.name, movieId: casts.movieId })
            .from(casts)
            .where(eq(casts.movieId, movie.id))
            .orderBy(asc(casts.name)),
        db
            .select()
            .from(videos)
            .where(eq(videos.movieId, movie.id))
            .orderBy(asc(videos.createdAt)),
    ]);
    const qualityRows = videoRows.length
        ? await db
            .select()
            .from(videoQualities)
            .where(inArray(videoQualities.videoId, videoRows.map((video) => video.id)))
            .orderBy(qualityOrder === "quality"
            ? asc(videoQualities.quality)
            : asc(videoQualities.createdAt))
        : [];
    const qualityMap = new Map();
    for (const quality of qualityRows) {
        const current = qualityMap.get(quality.videoId) ?? [];
        current.push(quality);
        qualityMap.set(quality.videoId, current);
    }
    const hydratedVideos = videoRows.map((video) => ({
        ...video,
        qualities: (qualityMap.get(video.id) ?? []).map((quality) => ({
            id: quality.id,
            quality: quality.quality,
            url: quality.url,
            bitrate: quality.bitrate,
        })),
    }));
    return {
        ...movie,
        cast: castRows.map((cast) => ({ id: cast.id, name: cast.name })),
        videos: hydratedVideos,
    };
};
const hydrateMovies = async () => {
    const movieRows = await db.select().from(movies).orderBy(desc(movies.createdAt));
    const results = [];
    for (const movie of movieRows) {
        const hydrated = await getMovieAggregate({ id: movie.id }, "quality");
        if (hydrated) {
            results.push(hydrated);
        }
    }
    return results;
};
export const createMovieUpload = asyncHandler(async (req, res) => {
    const { title, shortDescription, description, slug, genres: rawGenres, language, releaseYear, ageRating, duration, rating, } = req.body;
    if (!title ||
        !description ||
        !slug ||
        !rawGenres ||
        !language ||
        !releaseYear ||
        !duration ||
        !shortDescription ||
        !ageRating ||
        !rating) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "All required fields must be provided");
    }
    const genresInput = Array.isArray(rawGenres) ? rawGenres : [rawGenres];
    const existingMovie = await db.query.movies.findFirst({
        where: eq(movies.slug, slug),
    });
    if (existingMovie) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Slug already exists");
    }
    const movie = await db.transaction(async (tx) => {
        const [createdMovie] = await tx
            .insert(movies)
            .values({
            title,
            description,
            slug,
            genres: genresInput,
            language,
            releaseYear: Number(releaseYear),
            duration: Number(duration),
            shortDescription,
            ageRating,
            rating: String(rating),
            status: movieStatusEnum.enumValues[0],
            updatedAt: new Date(),
        })
            .returning();
        return createdMovie;
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
        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3000 });
        return {
            uploadUrl,
            fileUrl: buildCdnFileUrl(key),
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
    const url = await getSignedUrl(s3, command, { expiresIn: 3000 });
    res.status(HTTP_STATUS.OK).json({ url });
});
export const completeMultipartUpload = asyncHandler(async (req, res) => {
    const { key, uploadId, parts, movieId, type } = req.body;
    if (!key || !uploadId || !parts || !movieId || !type) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Missing fields");
    }
    await s3.send(new CompleteMultipartUploadCommand({
        Bucket: S3_CREDENTIAL.S3_BUCKET,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
            Parts: parts,
        },
    }));
    const fileUrl = buildS3FileUrl(key);
    const [movie] = await db
        .update(movies)
        .set({
        ...(type === "video" ? { videoUrl: fileUrl } : { trailerUrl: fileUrl }),
        updatedAt: new Date(),
    })
        .where(eq(movies.id, movieId))
        .returning();
    const queueJob = await videoQueue.add("convert-to-hls", {
        videoUrl: fileUrl,
        movieId,
        sourceKey: key,
        assetType: type,
    }, {
        jobId: `${movieId}:${type}:${Date.now()}`,
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
    const [movie] = await db
        .update(movies)
        .set({
        thumbnailUrl,
        updatedAt: new Date(),
    })
        .where(eq(movies.id, movieId))
        .returning();
    res
        .status(HTTP_STATUS.OK)
        .json(new ApiResponse(HTTP_STATUS.OK, "Thumbnail saved", movie));
});
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
            .filter((currentJob) => currentJob.data.movieId === movieId &&
            currentJob.data.assetType === assetType)
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
    const movie = await getMovieAggregate({ id: movieId });
    if (!movie) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Movie not found");
    }
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
                            .filter((item) => Boolean(item))
                            .map((item) => ({ Key: item })),
                    },
                }));
            }
            continuationToken = listed.IsTruncated
                ? listed.NextContinuationToken
                : undefined;
        } while (continuationToken);
    };
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
        return key.replace(/\/[^/]+$/, "/").replace("/Processing/", "/Original/");
    };
    const getProcessingPrefix = (url) => {
        if (!url)
            return null;
        const key = extractKeyFromUrl(url);
        if (!key || !key.includes("/Processing/"))
            return null;
        return key.replace(/\/[^/]+$/, "/");
    };
    const deletePromises = [];
    if (movie.videoUrl) {
        const processingPrefix = getProcessingPrefix(movie.videoUrl);
        const originalPrefix = getOriginalPrefixFromProcessingUrl(movie.videoUrl);
        if (processingPrefix)
            deletePromises.push(deleteFolderByPrefix(processingPrefix));
        if (originalPrefix)
            deletePromises.push(deleteFolderByPrefix(originalPrefix));
    }
    if (movie.trailerUrl) {
        const processingPrefix = getProcessingPrefix(movie.trailerUrl);
        const originalPrefix = getOriginalPrefixFromProcessingUrl(movie.trailerUrl);
        if (processingPrefix)
            deletePromises.push(deleteFolderByPrefix(processingPrefix));
        if (originalPrefix)
            deletePromises.push(deleteFolderByPrefix(originalPrefix));
    }
    if (movie.thumbnailUrl) {
        const key = extractKeyFromUrl(movie.thumbnailUrl);
        if (key) {
            deletePromises.push(deleteSingleObject(key));
        }
    }
    await Promise.all(deletePromises);
    await db.delete(movies).where(eq(movies.id, movieId));
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Movie and files deleted successfully", {}));
});
export const getMovieById = asyncHandler(async (req, res) => {
    const movieId = typeof req.params.id === "string" ? req.params.id : req.params.id?.[0];
    if (!movieId) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Movie ID is required");
    }
    const movie = await getMovieAggregate({ id: movieId });
    if (!movie) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Movie not found");
    }
    const movieVideos = movie.videos.filter((video) => video.type === "MOVIE");
    const trailers = movie.videos.filter((video) => video.type === "TRAILER");
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Movie fetched successfully", {
        movie: {
            ...movie,
            videos: movieVideos,
            trailers,
        },
    }));
});
export const getAllMovies = asyncHandler(async (_req, res) => {
    const movieRows = await hydrateMovies();
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Movies fetched", { movies: movieRows }));
});
export const getMovieBySlug = asyncHandler(async (req, res) => {
    const slug = req.params.slug;
    const movie = await getMovieAggregate({ slug });
    if (!movie) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Movie not found");
    }
    const movieVideos = movie.videos.filter((video) => video.type === "MOVIE");
    const trailers = movie.videos.filter((video) => video.type === "TRAILER");
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Movie fetched successfully", {
        movie: {
            ...movie,
            videos: movieVideos,
            trailers,
        },
    }));
});
//# sourceMappingURL=uploadController.js.map