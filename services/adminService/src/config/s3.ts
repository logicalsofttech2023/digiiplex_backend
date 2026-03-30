import { S3Client } from "@aws-sdk/client-s3";
import { S3_CREDENTIAL } from "../constants/constant.js";


export const s3 = new S3Client({
  region: S3_CREDENTIAL.S3_REGION as string,
  endpoint: S3_CREDENTIAL.S3_ENDPOINT as string,
  credentials: {
    accessKeyId: S3_CREDENTIAL.S3_ACCESS_KEY as string,
    secretAccessKey: S3_CREDENTIAL.S3_SECRET_KEY as string,
  },
  forcePathStyle: true,
});