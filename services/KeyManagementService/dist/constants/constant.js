import { config } from "dotenv";
config();
const requiredEnv = (value, key) => {
    if (!value) {
        throw new Error(`Missing env variable: ${key}`);
    }
    return value;
};
export const PORT = requiredEnv(process.env.PORT, "PORT");
export const NODE_ENV = requiredEnv(process.env.NODE_ENV, "NODE_ENV");
export const GRPC_PORT = process.env.GRPC_PORT || "50051";
export const GRPC_ADDRESS = `0.0.0.0:${GRPC_PORT}`;
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
//# sourceMappingURL=constant.js.map