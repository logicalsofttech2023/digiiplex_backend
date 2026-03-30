import { config } from "dotenv";
config();
const requiredEnv = (value, key) => {
    if (!value) {
        throw new Error(`Missing env variable: ${key}`);
    }
    return value;
};
export const PORT = process.env.PORT || 3006;
export const NODE_ENV = process.env.NODE_ENV || "development";
export const JWT_SECRET = process.env.JWT_SECRET || "secret";
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";
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
export const MESSAGES = {
    COMMON: {
        SOMETHING_WENT_WRONG: "Something went wrong",
    },
    AUTH: {
        INVALID_CREDENTIALS: "Invalid credentials",
        TOKEN_EXPIRED: "Token expired",
    },
    ADMIN: {
        CREATED: "Admin created successfully",
        UPDATED: "Admin updated successfully",
        DELETED: "Admin deleted successfully",
        LOGIN_SUCCESS: "Login successful",
        NOT_FOUND: "Admin not found",
        ALREADY_EXISTS: "Admin already exists",
    },
    CREATOR: {
        CREATED: "Creator created successfully",
        UPDATED: "Creator updated successfully",
        DELETED: "Creator deleted successfully",
        LOGIN_SUCCESS: "Login successful",
        NOT_FOUND: "Creator not found",
        ALREADY_EXISTS: "Creator already exists",
    },
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
//# sourceMappingURL=constant.js.map