import path from "path";
import { S3_CREDENTIAL } from "../constants/constant.js";
import { BUNNY } from "../config/bunny.js";




// Hetzner S3 URL — internal use only (upload, delete ke liye)
export const buildS3FileUrl = (key: string) =>
  `${S3_CREDENTIAL.S3_ENDPOINT}/${S3_CREDENTIAL.S3_BUCKET}/${key}`;

// Bunny CDN URL — public serving ke liye (DB mein save hoga)
export const buildCdnFileUrl = (key: string) =>
  `https://${BUNNY.VIDEO_CDN_URL}/${key}`;

export const extractKeyFromUrl = (url: string | null | undefined) => {
  if (!url) return null;

  // Bunny URL se key nikalo
  const bunnyBase = `https://${BUNNY.VIDEO_CDN_URL}/`;
  if (url.startsWith(bunnyBase)) return url.slice(bunnyBase.length);

  // Hetzner URL se key nikalo
  const hetznerBase = `${S3_CREDENTIAL.S3_ENDPOINT}/${S3_CREDENTIAL.S3_BUCKET}/`;
  if (url.startsWith(hetznerBase)) return url.slice(hetznerBase.length);

  return url;
};

export const buildProcessingAssetPrefix = (
  sourceKey: string,
  assetType: string,
) => {
  const normalizedKey = sourceKey.replace(/\\/g, "/");
  const processingBase = path.posix.dirname(
    normalizedKey.replace("/Original/", "/Processing/"),
  );

  return `${processingBase}/${assetType}`;
};
