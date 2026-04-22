import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HTTP_STATUS } from "../constants/constant.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import { db, uploads, videos, videoAssets, } from "@digiiplex6112/db";
const parseCount = (value) => Number(value ?? 0);
const getVideoAggregate = async (videoId) => {
    const video = await db.query.videos.findFirst({
        where: eq(videos.id, videoId),
    });
    if (!video)
        return null;
    const assets = await db
        .select()
        .from(videoAssets)
        .where(eq(videoAssets.videoId, videoId));
    // Fetch upload info for extra context
    const upload = await db.query.uploads.findFirst({
        where: eq(uploads.id, video.uploadId),
        columns: {
            id: true,
            creatorId: true,
            type: true,
            genreId: true,
            languageId: true,
            metadata: true,
            status: true,
            createdAt: true,
        },
    });
    return { ...video, assets, upload };
};
export const getPendingVideos = asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 10);
    const offset = (page - 1) * limit;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    // DRAFT = transcoding done, waiting for admin review
    const where = and(eq(videos.status, "DRAFT"), search ? ilike(videos.title, `%${search}%`) : undefined);
    const [rows, [{ count }]] = await Promise.all([
        db
            .select()
            .from(videos)
            .where(where)
            .orderBy(desc(videos.createdAt))
            .limit(limit)
            .offset(offset),
        db
            .select({ count: sql `cast(count(*) as int)` })
            .from(videos)
            .where(where),
    ]);
    // Hydrate each with assets + upload info
    const result = await Promise.all(rows.map((v) => getVideoAggregate(v.id)));
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Pending videos fetched", {
        videos: result,
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
        },
    }));
});
export const getAllVideosAdmin = asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 10);
    const offset = (page - 1) * limit;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const where = and(status ? eq(videos.status, status) : undefined, search ? ilike(videos.title, `%${search}%`) : undefined);
    const [rows, [{ count }]] = await Promise.all([
        db
            .select()
            .from(videos)
            .where(where)
            .orderBy(desc(videos.createdAt))
            .limit(limit)
            .offset(offset),
        db
            .select({ count: sql `cast(count(*) as int)` })
            .from(videos)
            .where(where),
    ]);
    const result = await Promise.all(rows.map((v) => getVideoAggregate(v.id)));
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Videos fetched", {
        videos: result,
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit),
        },
    }));
});
export const getVideoDetailAdmin = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const video = await getVideoAggregate(videoId);
    if (!video)
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Video not found");
    return res
        .status(HTTP_STATUS.OK)
        .json(new ApiResponse(HTTP_STATUS.OK, "Video fetched", { video }));
});
export const approveVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const video = await db.query.videos.findFirst({
        where: eq(videos.id, videoId),
    });
    if (!video)
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Video not found");
    if (video.status === "PUBLISHED") {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Video is already published");
    }
    if (video.status !== "DRAFT") {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Cannot approve video with status: ${video.status}`);
    }
    const [updated] = await db
        .update(videos)
        .set({
        status: "PUBLISHED",
        publishedAt: new Date(),
        updatedAt: new Date(),
    })
        .where(eq(videos.id, videoId))
        .returning();
    // Also mark the upload as IN_REVIEW → we keep upload READY, no change needed
    // Just log the approval
    console.log(`Video approved: ${videoId} — "${updated.title}"`);
    return res
        .status(HTTP_STATUS.OK)
        .json(new ApiResponse(HTTP_STATUS.OK, "Video approved and published", {
        video: updated,
    }));
});
export const rejectVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { reason } = req.body;
    if (!reason?.trim()) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Rejection reason is required");
    }
    const video = await db.query.videos.findFirst({
        where: eq(videos.id, videoId),
    });
    if (!video)
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Video not found");
    if (video.status === "BLOCKED") {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Video is already rejected/blocked");
    }
    // Mark video as BLOCKED
    const [updated] = await db
        .update(videos)
        .set({ status: "BLOCKED", updatedAt: new Date() })
        .where(eq(videos.id, videoId))
        .returning();
    // Mark upload as REJECTED with reason
    await db
        .update(uploads)
        .set({
        status: "REJECTED",
        errorMessage: reason,
        updatedAt: new Date(),
    })
        .where(eq(uploads.id, video.uploadId));
    console.log(`❌ Video rejected: ${videoId} — reason: ${reason}`);
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Video rejected", {
        video: updated,
        reason,
    }));
});
export const archiveVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const video = await db.query.videos.findFirst({
        where: eq(videos.id, videoId),
    });
    if (!video)
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Video not found");
    if (video.status !== "PUBLISHED") {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Only published videos can be archived");
    }
    const [updated] = await db
        .update(videos)
        .set({ status: "ARCHIVED", updatedAt: new Date() })
        .where(eq(videos.id, videoId))
        .returning();
    return res
        .status(HTTP_STATUS.OK)
        .json(new ApiResponse(HTTP_STATUS.OK, "Video archived", { video: updated }));
});
export const publishVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const video = await db.query.videos.findFirst({
        where: eq(videos.id, videoId),
    });
    if (!video)
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Video not found");
    if (video.status === "PUBLISHED") {
        return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Video already published", { video }));
    }
    if (!["ARCHIVED", "BLOCKED", "DRAFT"].includes(video.status)) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, `Cannot publish video with status: ${video.status}`);
    }
    const [updated] = await db
        .update(videos)
        .set({
        status: "PUBLISHED",
        publishedAt: video.publishedAt ?? new Date(),
        updatedAt: new Date(),
    })
        .where(eq(videos.id, videoId))
        .returning();
    return res
        .status(HTTP_STATUS.OK)
        .json(new ApiResponse(HTTP_STATUS.OK, "Video published", { video: updated }));
});
export const updateVideoAdmin = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description, synopsis, maturityRating, genres: genresList, tags, cast, crew, availableFrom, availableTo, geoRestrictions, } = req.body;
    const video = await db.query.videos.findFirst({
        where: eq(videos.id, videoId),
    });
    if (!video)
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Video not found");
    const [updated] = await db
        .update(videos)
        .set({
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(synopsis !== undefined && { synopsis }),
        ...(maturityRating && { maturityRating }),
        ...(genresList && { genres: genresList }),
        ...(tags && { tags }),
        ...(cast && { cast }),
        ...(crew && { crew }),
        ...(availableFrom && { availableFrom: new Date(availableFrom) }),
        ...(availableTo && { availableTo: new Date(availableTo) }),
        ...(geoRestrictions && { geoRestrictions }),
        updatedAt: new Date(),
    })
        .where(eq(videos.id, videoId))
        .returning();
    return res
        .status(HTTP_STATUS.OK)
        .json(new ApiResponse(HTTP_STATUS.OK, "Video updated", { video: updated }));
});
export const deleteVideoAdmin = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const video = await db.query.videos.findFirst({
        where: eq(videos.id, videoId),
    });
    if (!video)
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Video not found");
    // Soft delete
    await db
        .update(videos)
        .set({ status: "DELETED", deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(videos.id, videoId));
    return res
        .status(HTTP_STATUS.OK)
        .json(new ApiResponse(HTTP_STATUS.OK, "Video deleted", {}));
});
//# sourceMappingURL=AdminStreamingController.js.map