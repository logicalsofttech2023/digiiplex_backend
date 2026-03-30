import path from "path";
import { S3_CREDENTIAL } from "../constants/constant.js";
export const buildS3FileUrl = (key) => `${S3_CREDENTIAL.S3_ENDPOINT}/${S3_CREDENTIAL.S3_BUCKET}/${key}`;
export const extractKeyFromUrl = (url) => {
    if (!url) {
        return null;
    }
    const base = `${S3_CREDENTIAL.S3_ENDPOINT}/${S3_CREDENTIAL.S3_BUCKET}/`;
    return url.startsWith(base) ? url.slice(base.length) : url;
};
export const buildProcessingAssetPrefix = (sourceKey, assetType) => {
    const normalizedKey = sourceKey.replace(/\\/g, "/");
    const processingBase = path.posix
        .dirname(normalizedKey.replace("/Original/", "/Processing/"));
    return `${processingBase}/${assetType}`;
};
//# sourceMappingURL=storagePath.js.map