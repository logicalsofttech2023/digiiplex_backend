import { Request, Response, NextFunction } from "express";
import ApiError from "../utils/ApiError.js";
import { HTTP_STATUS } from "../constants/constant.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { ACCESS_TOKEN_COOKIE } from "../utils/authCookies.js";

export const authMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  const token =
    req.cookies?.[ACCESS_TOKEN_COOKIE] ||
    (authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : undefined);

  if (!token) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Token missing");
  }

  try {
    const decoded = await verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid token");
  }
};
