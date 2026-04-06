// types/custom.d.ts

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

declare global {
  namespace Express {
    namespace Multer {
      interface File {
        location?: string;
      }
    }

    interface Request {
      user?: {
        id: string;
        role: string;
        [key: string]: any;
      };
      files?:
        | Express.Multer.File[]
        | { [fieldname: string]: Express.Multer.File[] };
    }
  }
}

export {}; // 🔥 VERY IMPORTANT
