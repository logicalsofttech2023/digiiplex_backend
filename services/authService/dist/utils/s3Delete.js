import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../config/s3.js";
import { S3_CREDENTIAL } from "../constants/constant.js";
export const deleteFromS3 = async (fileUrl) => {
    try {
        if (!fileUrl)
            return;
        const url = new URL(fileUrl);
        let key = decodeURIComponent(url.pathname);
        key = key.replace(/^\/+/, "");
        key = key.replace(`${S3_CREDENTIAL.S3_BUCKET}/`, "");
        const command = new DeleteObjectCommand({
            Bucket: S3_CREDENTIAL.S3_BUCKET,
            Key: key,
        });
        await s3.send(command);
        console.log("✅ Deleted from S3:", key);
    }
    catch (error) {
        console.error("❌ S3 Delete Error:", error);
    }
};
//# sourceMappingURL=s3Delete.js.map