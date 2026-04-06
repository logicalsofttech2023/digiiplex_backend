import { S3Client } from "@aws-sdk/client-s3";
import { S3_CREDENTIAL } from "../constants/constant.js";
export const s3 = new S3Client({
    region: S3_CREDENTIAL.S3_REGION,
    endpoint: S3_CREDENTIAL.S3_ENDPOINT,
    credentials: {
        accessKeyId: S3_CREDENTIAL.S3_ACCESS_KEY,
        secretAccessKey: S3_CREDENTIAL.S3_SECRET_KEY,
    },
    forcePathStyle: true,
});
//# sourceMappingURL=s3.js.map