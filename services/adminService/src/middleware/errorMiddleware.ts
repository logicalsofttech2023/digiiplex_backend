import { NextFunction, Request, Response } from "express";
import ApiError from "../utils/ApiError.js";
import { NODE_ENV } from "../constants/constant.js";

export const errorMiddleware = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let statusCode = 500;
  let message = "Internal Server Error";
  let errors: unknown[] = [];


  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err instanceof Error) {
    const error = err as any;

    message =
      error.cause?.message ||
      error.detail ||
      error.hint ||
      error.message;

    console.error("🔥 FULL ERROR:", error);
  }

  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors,
    ...(NODE_ENV !== "production" && {
      stack: (err as Error).stack,
    }),
  });
};
