import { and, desc, eq, sql, ilike, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HTTP_STATUS } from "../constants/constant.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import { db, videos, videoAssets, watchHistory, streamingSessions, } from "@digiiplex6112/db";
export const getPublishedVideos = asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 10);
    const offset = (page - 1) * limit;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const where = and(eq(videos.status, "PUBLISHED"), search ? ilike(videos.title, `%${search}%`) : undefined);
    const [rows, [{ count }]] = await Promise.all([
        db
            .select()
            .from(videos)
            .where(where)
            .orderBy(desc(videos.publishedAt))
            .limit(limit)
            .offset(offset),
        db
            .select({ count: sql `cast(count(*) as int)` })
            .from(videos)
            .where(where),
    ]);
    const videoIds = rows.map((v) => v.id);
    const assets = videoIds.length
        ? await db
            .select()
            .from(videoAssets)
            .where(and(inArray(videoAssets.videoId, videoIds), eq(videoAssets.assetType, "MAIN")))
        : [];
    const assetMap = new Map(assets.map((a) => [a.videoId, a]));
    const result = rows.map((v) => {
        const asset = assetMap.get(v.id);
        return {
            ...v,
            thumbnailUrl: asset?.thumbnailUrl ?? null,
            availableQualities: asset?.availableQualities ?? [],
        };
    });
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
export const getVideoDetail = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const video = await db
        .select()
        .from(videos)
        .where(and(eq(videos.id, videoId), eq(videos.status, "PUBLISHED")))
        .limit(1)
        .then((res) => res[0]);
    if (!video)
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Video not found");
    const assets = await db
        .select()
        .from(videoAssets)
        .where(eq(videoAssets.videoId, videoId));
    const mainAsset = assets.find((a) => a.assetType === "MAIN");
    const trailerAsset = assets.find((a) => a.assetType === "TRAILER");
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Video fetched", {
        video: {
            ...video,
            mainAsset: mainAsset ?? null,
            trailerAsset: trailerAsset ?? null,
        },
    }));
});
export const getPlayUrl = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { assetType = "MAIN", deviceId, deviceInfo } = req.body;
    const userId = req.user?.id;
    const video = await db
        .select()
        .from(videos)
        .where(and(eq(videos.id, videoId), eq(videos.status, "PUBLISHED")))
        .limit(1)
        .then((res) => res[0]);
    if (!video)
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Video not found or not published");
    const asset = await db
        .select()
        .from(videoAssets)
        .where(and(eq(videoAssets.videoId, videoId), eq(videoAssets.assetType, assetType)))
        .limit(1)
        .then((res) => res[0]);
    if (!asset)
        throw new ApiError(HTTP_STATUS.NOT_FOUND, `${assetType} asset not found`);
    let sessionToken = null;
    if (userId) {
        const token = randomUUID();
        await db.insert(streamingSessions).values({
            userId: Array.isArray(userId) ? userId[0] : userId,
            videoId: Array.isArray(videoId) ? videoId[0] : videoId,
            videoAssetId: asset.id,
            sessionToken: token,
            deviceId: Array.isArray(deviceId) ? deviceId[0] : (deviceId ?? null),
            deviceInfo: deviceInfo ?? {},
            clientIp: Array.isArray(req.ip) ? req.ip[0] : (req.ip ?? null),
        });
        sessionToken = token;
    }
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Play URL ready", {
        masterPlaylistUrl: asset.masterPlaylistUrl,
        streamingProtocol: asset.streamingProtocol,
        availableQualities: asset.availableQualities ?? [],
        drmEnabled: asset.drmEnabled,
        drmProvider: asset.drmProvider,
        sessionToken,
        video: {
            id: video.id,
            title: video.title,
            duration: video.duration,
            thumbnailUrl: asset.thumbnailUrl,
        },
    }));
});
export const saveWatchProgress = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { position, duration, completed = false, videoAssetId, sessionToken, } = req.body;
    const userId = req.user?.id;
    if (!userId)
        throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Login required");
    if (position === undefined)
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "position is required");
    const getString = (val) => Array.isArray(val) ? val[0] : (val ?? null);
    await db
        .insert(watchHistory)
        .values({
        userId: getString(userId),
        videoId: getString(videoId),
        videoAssetId: videoAssetId ?? null,
        position: Number(position),
        duration: duration ? Number(duration) : null,
        completed,
        ipAddress: getString(req.ip),
        userAgent: getString(req.headers["user-agent"]),
    })
        .onConflictDoUpdate({
        target: [
            watchHistory.userId,
            watchHistory.videoId,
            watchHistory.videoAssetId,
        ],
        set: {
            position: Number(position),
            completed,
            watchedAt: new Date(),
        },
    });
    if (sessionToken) {
        await db
            .update(streamingSessions)
            .set({
            lastHeartbeat: new Date(),
            totalWatchTime: sql `total_watch_time + ${Math.round(Number(position))}`,
        })
            .where(eq(streamingSessions.sessionToken, sessionToken));
    }
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Progress saved", {
        position,
        completed,
    }));
});
export const endStreamingSession = asyncHandler(async (req, res) => {
    const { sessionToken } = req.body;
    if (!sessionToken)
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "sessionToken is required");
    await db
        .update(streamingSessions)
        .set({ endedAt: new Date() })
        .where(eq(streamingSessions.sessionToken, sessionToken));
    return res
        .status(HTTP_STATUS.OK)
        .json(new ApiResponse(HTTP_STATUS.OK, "Session ended", {}));
});
export const getWatchHistory = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId)
        throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Login required");
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const history = await db
        .select()
        .from(watchHistory)
        .where(eq(watchHistory.userId, userId))
        .orderBy(desc(watchHistory.watchedAt))
        .limit(limit)
        .offset(offset);
    const videoIds = [...new Set(history.map((h) => h.videoId))];
    const videoRows = videoIds.length
        ? await db.select().from(videos).where(inArray(videos.id, videoIds))
        : [];
    const videoMap = new Map(videoRows.map((v) => [v.id, v]));
    const result = history.map((h) => ({
        ...h,
        video: videoMap.get(h.videoId) ?? null,
    }));
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Watch history fetched", {
        history: result,
        pagination: { page, limit },
    }));
});
//# sourceMappingURL=streamController.js.map