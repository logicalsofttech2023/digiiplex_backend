import multer from "multer";
import multerS3 from "multer-s3";
import { s3 } from "../config/s3.js";
import { Request } from "express";
import { S3_CREDENTIAL } from "../constants/constant.js";

interface MulterRequest extends Request {
  file: Express.MulterS3.File;
  params: {
    folder?: string;
  };
}

export const upload = multer({
  storage: multerS3({
    s3,
    bucket: S3_CREDENTIAL.S3_BUCKET,
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req: MulterRequest, file: any, cb: any) => {
      const folder = req.params?.folder || "default";

      const fileName = `${folder}/${Date.now()}-${file.originalname}`;
      cb(null, fileName);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});