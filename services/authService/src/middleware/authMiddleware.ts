import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.js";
import { HTTP_STATUS } from "../constants/constant.js";

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Authorization header missing");

  const token = authHeader.split(" ")[1];
  if (!token) throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Token missing");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; role: string };
    req.user = decoded; // ✅ TypeScript ab recognize karega req.user
    next();
  } catch (err) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid token");
  }
};