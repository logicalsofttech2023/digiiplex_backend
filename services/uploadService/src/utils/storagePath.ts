import path from "path";
import { S3_CREDENTIAL } from "../constants/constant.js";

export const buildS3FileUrl = (key: string) =>
  `${S3_CREDENTIAL.S3_ENDPOINT}/${S3_CREDENTIAL.S3_BUCKET}/${key}`;

export const extractKeyFromUrl = (url: string | null | undefined) => {
  if (!url) {
    return null;
  }

  const base = `${S3_CREDENTIAL.S3_ENDPOINT}/${S3_CREDENTIAL.S3_BUCKET}/`;
  return url.startsWith(base) ? url.slice(base.length) : url;
};

export const buildProcessingAssetPrefix = (
  sourceKey: string,
  assetType: string,
) => {
  const normalizedKey = sourceKey.replace(/\\/g, "/");
  const processingBase = path.posix
    .dirname(normalizedKey.replace("/Original/", "/Processing/"));

  return `${processingBase}/${assetType}`;
};
