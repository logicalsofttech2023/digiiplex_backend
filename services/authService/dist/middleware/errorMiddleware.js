import ApiError from "../utils/ApiError.js";
import { NODE_ENV } from "../constants/constant.js";
export const errorMiddleware = (err, req, res, next) => {
    let statusCode = 500;
    let message = "Internal Server Error";
    let errors = [];
    if (err instanceof ApiError) {
        statusCode = err.statusCode;
        message = err.message;
        errors = err.errors;
    }
    if (err instanceof Error && !(err instanceof ApiError)) {
        message = err.message;
    }
    return res.status(statusCode).json({
        success: false,
        statusCode,
        message,
        errors,
        ...(NODE_ENV !== "production" && {
            stack: err.stack,
        }),
    });
};
//# sourceMappingURL=errorMiddleware.js.map