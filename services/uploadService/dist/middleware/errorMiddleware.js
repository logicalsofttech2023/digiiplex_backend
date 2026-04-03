import ApiError from "../utils/ApiError.js";
import { NODE_ENV } from "../constants/constant.js";
export const errorMiddleware = (err, req, res, next) => {
    console.error("=== ERROR MIDDLEWARE ===");
    console.error("Type:", err?.constructor?.name);
    console.error("Message:", err?.message);
    console.error("Detail:", err?.detail);
    console.error("Code:", err?.code);
    console.error("Cause:", err?.cause); // add
    console.error("Cause Message:", err?.cause?.message); // add
    console.error("Cause Detail:", err?.cause?.detail); // add
    console.error("Cause Code:", err?.cause?.code); // add
    console.error("Stack:", err?.stack);
    console.error("=======================");
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
            detail: err.detail,
            code: err.code,
        }),
    });
};
//# sourceMappingURL=errorMiddleware.js.map