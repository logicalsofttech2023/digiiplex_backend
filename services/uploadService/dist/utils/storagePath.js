import { S3_CREDENTIAL } from "../constants/constant.js";
import { BUNNY } from "../config/bunny.js";
// ─────────────────────────────────────────────
// BASIC URL BUILDERS
// ─────────────────────────────────────────────
export const buildS3FileUrl = (key) => `${S3_CREDENTIAL.S3_ENDPOINT}/${S3_CREDENTIAL.S3_BUCKET}/${key}`;
export const buildCdnFileUrl = (key) => `https://${BUNNY.VIDEO_CDN_URL}/${key}`;
export const extractKeyFromUrl = (url) => {
    if (!url)
        return null;
    const bunnyBase = `https://${BUNNY.VIDEO_CDN_URL}/`;
    if (url.startsWith(bunnyBase))
        return url.slice(bunnyBase.length);
    const hetznerBase = `${S3_CREDENTIAL.S3_ENDPOINT}/${S3_CREDENTIAL.S3_BUCKET}/`;
    if (url.startsWith(hetznerBase))
        return url.slice(hetznerBase.length);
    return url;
};
// ─────────────────────────────────────────────
// SLUG HELPER
// "Pushpa: The Rise" → "pushpa-the-rise"
// ─────────────────────────────────────────────
export const toSlug = (value) => value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-") // spaces → hyphens
    .replace(/-+/g, "-"); // collapse multiple hyphens
// ─────────────────────────────────────────────
// SEGMENT BUILDERS (internal)
// ─────────────────────────────────────────────
const buildSegments = (ctx) => ({
    creator: toSlug(ctx.creatorEmail.split("@")[0]), // "john"
    category: toSlug(ctx.category), // "movie"
    genre: toSlug(ctx.genreName), // "action"
    title: toSlug(ctx.movieTitle), // "pushpa-the-rise"
    uploadId: ctx.uploadId,
});
// ─────────────────────────────────────────────
// ORIGINAL FILE KEY
// Used when creator uploads raw file to S3
//
// john/movie/action/Original/pushpa-the-rise/{uploadId}/MAIN/original-{ts}.mp4
// john/movie/action/Original/pushpa-the-rise/{uploadId}/TRAILER/original-{ts}.mp4
// john/movie/action/Original/pushpa-the-rise/{uploadId}/THUMBNAIL/thumbnail-{ts}.jpg
// ─────────────────────────────────────────────
export const buildOriginalVideoKey = (ctx, assetRole) => {
    const s = buildSegments(ctx);
    return `${s.creator}/${s.category}/${s.genre}/Original/${s.title}/${s.uploadId}/${assetRole}/original-${Date.now()}.mp4`;
};
export const buildOriginalThumbnailKey = (ctx) => {
    const s = buildSegments(ctx);
    return `${s.creator}/${s.category}/${s.genre}/Original/${s.title}/${s.uploadId}/THUMBNAIL/thumbnail-${Date.now()}.jpg`;
};
// ─────────────────────────────────────────────
// PROCESSING PREFIX
// Used by worker to upload HLS segments
//
// john/movie/action/Processing/pushpa-the-rise/{uploadId}/MAIN/
// john/movie/action/Processing/pushpa-the-rise/{uploadId}/TRAILER/
// ─────────────────────────────────────────────
export const buildProcessingPrefix = (ctx, assetRole) => {
    const s = buildSegments(ctx);
    return `${s.creator}/${s.category}/${s.genre}/Processing/${s.title}/${s.uploadId}/${assetRole}`;
};
// ─────────────────────────────────────────────
// PROCESSING ASSET PREFIX (legacy compat)
// Kept so existing worker call still works if needed
// ─────────────────────────────────────────────
export const buildProcessingAssetPrefix = (sourceKey, assetRole) => {
    const normalizedKey = sourceKey.replace(/\\/g, "/");
    const withProcessing = normalizedKey.replace("/Original/", "/Processing/");
    // Strip filename, replace assetRole folder
    const parts = withProcessing.split("/");
    // Remove last segment (filename) and assetRole folder
    // structure: creator/category/genre/Processing/title/uploadId/ASSETROLE/filename
    parts.splice(-2, 2); // remove "ASSETROLE/filename"
    return `${parts.join("/")}/${assetRole}`;
};
//# sourceMappingURL=storagePath.js.map