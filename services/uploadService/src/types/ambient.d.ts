declare module "cors";

declare module "multer";

declare module "multer-s3" {
  const multerS3: any;
  export default multerS3;
}

declare module "fluent-ffmpeg" {
  const ffmpeg: any;
  export default ffmpeg;
}
