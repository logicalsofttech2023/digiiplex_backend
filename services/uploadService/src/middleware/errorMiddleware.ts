import { NextFunction, Request, Response } from "express";
import ApiError from "../utils/ApiError.js";
import { NODE_ENV } from "../constants/constant.js";

export const errorMiddleware = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error("=== ERROR MIDDLEWARE ===");
console.error("Type:", (err as any)?.constructor?.name);
console.error("Message:", (err as any)?.message);
console.error("Detail:", (err as any)?.detail);
console.error("Code:", (err as any)?.code);
console.error("Cause:", (err as any)?.cause);                    // add
console.error("Cause Message:", (err as any)?.cause?.message);   // add
console.error("Cause Detail:", (err as any)?.cause?.detail);     // add
console.error("Cause Code:", (err as any)?.cause?.code);         // add
console.error("Stack:", (err as any)?.stack);
console.error("=======================");


  let statusCode = 500;
  let message = "Internal Server Error";
  let errors: unknown[] = [];

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
      stack: (err as Error).stack,
      detail: (err as any).detail,
      code: (err as any).code,
    }),
  });
};
