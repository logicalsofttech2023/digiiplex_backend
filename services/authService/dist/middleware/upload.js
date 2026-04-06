import multer from "multer";
import multerS3 from "multer-s3";
import { s3 } from "../config/s3.js";
import { S3_CREDENTIAL } from "../constants/constant.js";
export const upload = (folder) => {
    return multer({
        storage: multerS3({
            s3,
            bucket: S3_CREDENTIAL.S3_BUCKET,
            acl: "public-read",
            contentType: multerS3.AUTO_CONTENT_TYPE,
            key: (_req, file, cb) => {
                const targetFolder = folder || "default";
                const fileName = `${targetFolder}/${Date.now()}-${file.originalname}`;
                cb(null, fileName);
            },
        }),
        limits: {
            fileSize: 10 * 1024 * 1024,
        },
    });
};
export default upload;
//# sourceMappingURL=upload.js.map