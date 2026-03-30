import { PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";
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
// function bana lo
export const setBucketCors = async () => {
    try {
        const command = new PutBucketCorsCommand({
            Bucket: "digiiplex-dev",
            CORSConfiguration: {
                CORSRules: [
                    {
                        AllowedHeaders: ["*"],
                        AllowedMethods: ["GET", "PUT"],
                        AllowedOrigins: ["http://localhost:5173"],
                        ExposeHeaders: ["ETag"],
                        MaxAgeSeconds: 3000,
                    },
                ],
            },
        });
        await s3.send(command);
        console.log("CORS applied successfully ✅");
    }
    catch (error) {
        console.error("CORS error ❌", error);
    }
};
//# sourceMappingURL=s3.js.map