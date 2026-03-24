import { config } from "dotenv";
config();
export const PORT = process.env.PORT || 3000;
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
};
export const MongoDB_URL = {
    URL: process.env.MONGO_URI || "",
};
//# sourceMappingURL=constant.js.map