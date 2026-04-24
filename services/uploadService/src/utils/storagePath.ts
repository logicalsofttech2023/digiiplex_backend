import { S3_CREDENTIAL } from "../constants/constant.js";
import { BUNNY } from "../config/bunny.js";

export const buildS3FileUrl = (key: string) =>
  `${S3_CREDENTIAL.S3_ENDPOINT}/${S3_CREDENTIAL.S3_BUCKET}/${key}`;
export const buildCdnFileUrl = (key: string) =>
  `https://${BUNNY.VIDEO_CDN_URL}/${key}`;

export const extractKeyFromUrl = (url: string | null | undefined) => {
  if (!url) return null;
  const bunnyBase = `https://${BUNNY.VIDEO_CDN_URL}/`;
  if (url.startsWith(bunnyBase)) return url.slice(bunnyBase.length);
  const hetznerBase = `${S3_CREDENTIAL.S3_ENDPOINT}/${S3_CREDENTIAL.S3_BUCKET}/`;
  if (url.startsWith(hetznerBase)) return url.slice(hetznerBase.length);
  return url;
};

export const toSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export interface StoragePathContext {
  creatorEmail: string;
  category: string;
  genreName: string;
  movieTitle: string;
  uploadId: string;
  showId?: string | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
}

const buildSegments = (ctx: StoragePathContext) => ({
  creator: toSlug(ctx.creatorEmail.split("@")[0]),
  category: toSlug(ctx.category),
  genre: toSlug(ctx.genreName),
  title: toSlug(ctx.movieTitle),
  uploadId: ctx.uploadId,
});

const buildSeriesSegment = (ctx: StoragePathContext): string | null => {
  if (!ctx.seasonNumber) return null;
  const season = `s${ctx.seasonNumber}`;
  if (ctx.episodeNumber) {
    return `${season}/e${ctx.episodeNumber}`;
  }
  return season;
};

const isSeries = (ctx: StoragePathContext) =>
  ctx.category.toUpperCase() === "SERIES" ||
  ctx.category.toUpperCase() === "EPISODE" ||
  ctx.category.toUpperCase() === "PODCAST_EP";

export const buildOriginalVideoKey = (
  ctx: StoragePathContext,
  assetRole: "MAIN" | "TRAILER" | "PROMO",
): string => {
  const s = buildSegments(ctx);
  const ts = Date.now();

  if (isSeries(ctx)) {
    const seriesSegment = buildSeriesSegment(ctx);
    if (!seriesSegment) {
      throw new Error("seasonNumber is required for series video upload");
    }
    return `${s.creator}/${s.category}/${s.genre}/Original/${s.title}/${seriesSegment}/${assetRole}/original-${ts}.mp4`;
  }

  return `${s.creator}/${s.category}/${s.genre}/Original/${s.title}/${s.uploadId}/${assetRole}/original-${ts}.mp4`;
};

export const buildOriginalAudioKey = (ctx: StoragePathContext): string => {
  const s = buildSegments(ctx);
  const ts = Date.now();

  if (isSeries(ctx)) {
    const seriesSegment = buildSeriesSegment(ctx);
    if (!seriesSegment) {
      throw new Error("seasonNumber is required for series audio upload");
    }
    return `${s.creator}/${s.category}/${s.genre}/Original/${s.title}/${seriesSegment}/AUDIO/original-${ts}.mp3`;
  }

  return `${s.creator}/${s.category}/${s.genre}/Original/${s.title}/${s.uploadId}/AUDIO/original-${ts}.mp3`;
};

export const buildOriginalThumbnailKey = (ctx: StoragePathContext): string => {
  const s = buildSegments(ctx);
  const ts = Date.now();

  if (isSeries(ctx)) {
    const seriesSegment = buildSeriesSegment(ctx);
    if (!seriesSegment) {
      throw new Error("seasonNumber is required for series thumbnail upload");
    }
    return `${s.creator}/${s.category}/${s.genre}/Original/${s.title}/${seriesSegment}/THUMBNAIL/thumbnail-${ts}.jpg`;
  }

  return `${s.creator}/${s.category}/${s.genre}/Original/${s.title}/${s.uploadId}/THUMBNAIL/thumbnail-${ts}.jpg`;
};

export const buildProcessingPrefix = (
  ctx: StoragePathContext,
  assetRole: "MAIN" | "TRAILER" | "PROMO",
): string => {
  const s = buildSegments(ctx);

  if (isSeries(ctx)) {
    const seriesSegment = buildSeriesSegment(ctx);
    if (!seriesSegment) {
      throw new Error("seasonNumber is required for series processing prefix");
    }
    return `${s.creator}/${s.category}/${s.genre}/Processing/${s.title}/${seriesSegment}/${assetRole}`;
  }

  return `${s.creator}/${s.category}/${s.genre}/Processing/${s.title}/${s.uploadId}/${assetRole}`;
};

export const buildProcessingAssetPrefix = (
  sourceKey: string,
  assetRole: string,
): string => {
  const normalizedKey = sourceKey.replace(/\\/g, "/");
  const withProcessing = normalizedKey.replace("/Original/", "/Processing/");
  const parts = withProcessing.split("/");
  parts.splice(-2, 2);
  return `${parts.join("/")}/${assetRole}`;
};
