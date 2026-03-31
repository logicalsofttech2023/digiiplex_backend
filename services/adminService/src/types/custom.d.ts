declare module "cors";
declare module "nodemailer";

declare module "multer" {
  const multer: any;
  export default multer;
}

declare module "multer-s3" {
  const multerS3: any;
  export default multerS3;
}

declare namespace Express {
  interface Request {
    file?: {
      location: string;
      originalname: string;
    };
  }
}
