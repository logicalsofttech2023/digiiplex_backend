import { config } from "dotenv";
config();

const requiredEnv = (value: string | undefined, key: string): string => {
  if (!value) {
    throw new Error(`Missing env variable: ${key}`);
  }
  return value;
};

export const PORT = requiredEnv(process.env.PORT, "PORT");
export const NODE_ENV = requiredEnv(process.env.NODE_ENV, "NODE_ENV");
export const ACCESS_TOKEN_EXPIRES_IN =
  process.env.ACCESS_TOKEN_EXPIRES_IN || "15m";
export const REFRESH_TOKEN_EXPIRES_IN =
  process.env.REFRESH_TOKEN_EXPIRES_IN || process.env.JWT_EXPIRES_IN || "7d";
export const KEY_MANAGEMENT_GRPC_ADDRESS =
  process.env.KEY_MANAGEMENT_GRPC_ADDRESS || "localhost:50051";

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  FORBIDDEN: 403,
  CONFLICT: 409,
};


export const MongoDB_URL = {
  URL: requiredEnv(process.env.MONGO_URI, "MONGO_URI"),
};

export const S3_CREDENTIAL = {
  S3_ENDPOINT: requiredEnv(process.env.S3_ENDPOINT, "S3_ENDPOINT"),
  S3_REGION: requiredEnv(process.env.S3_REGION, "S3_REGION"),
  S3_ACCESS_KEY: requiredEnv(process.env.S3_ACCESS_KEY, "S3_ACCESS_KEY"),
  S3_SECRET_KEY: requiredEnv(process.env.S3_SECRET_KEY, "S3_SECRET_KEY"),
  S3_BUCKET: requiredEnv(process.env.S3_BUCKET, "S3_BUCKET"),
};

export const FRONTEND_URL = requiredEnv(
  process.env.FRONTEND_URL,
  "FRONTEND_URL",
);
