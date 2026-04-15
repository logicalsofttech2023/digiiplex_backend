import { and, desc, eq, gt, sql, asc } from "drizzle-orm";
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HTTP_STATUS, MESSAGES } from "../constants/constant.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import { generateTokenPair, verifyRefreshToken } from "../utils/jwt.js";
import {
  clearAuthCookies,
  REFRESH_TOKEN_COOKIE,
  setAuthCookies,
} from "../utils/authCookies.js";
import { deleteFromS3 } from "../utils/s3Delete.js";
import { db, Users, profiles, genres, languages } from "@digiiplex6112/db";

// ================= OTP GENERATE =================
export const generateOTP = asyncHandler(async (req: Request, res: Response) => {
  const { phone } = req.body;

  if (!phone) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Phone number is required");
  }

  const otp = crypto.randomInt(1000, 9999).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  const [user] = await db
    .insert(Users)
    .values({
      phone,
      otp,
      expiresAt,
      isVerified: false,
    })
    .onConflictDoUpdate({
      target: Users.phone,
      set: {
        otp,
        expiresAt,
        isVerified: false,
        updatedAt: new Date(),
      },
    })
    .returning({ id: Users.id, phone: Users.phone });

  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, "OTP generated successfully", { otp }),
    );
});

// ================= OTP VERIFY =================
export const verifyOTP = asyncHandler(async (req: Request, res: Response) => {
  const { phone, otp } = req.body;

  // 🔹 USER VERIFY
  const [user] = await db
    .select()
    .from(Users)
    .where(
      and(
        eq(Users.phone, phone),
        eq(Users.otp, otp),
        gt(Users.expiresAt, new Date()),
        eq(Users.isDeleted, false),
      ),
    )
    .limit(1);

  if (!user) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid or expired OTP");
  }

  const [updatedUser] = await db
    .update(Users)
    .set({
      isVerified: true,
      otp: null,
      expiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(Users.id, user.id))
    .returning({
      id: Users.id,
      phone: Users.phone,
      email: Users.email,
      role: Users.role,
      isVerified: Users.isVerified,
    });

  const existingProfile = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.userId, updatedUser.id))
    .limit(1);

  const tokens = await generateTokenPair({
    id: updatedUser.id,
    role: updatedUser.role || "USER",
  });

  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

  const hasProfiles = existingProfile.length > 0;

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "OTP verified successfully", {
      user: updatedUser,
      hasProfiles,
      ...tokens,
    }),
  );
});

export const resendOTP = asyncHandler(async (req: Request, res: Response) => {
  const { phone } = req.body;

  if (!phone) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Phone number is required");
  }

  // 🔹 Check user exists
  const [existingUser] = await db
    .select({ id: Users.id })
    .from(Users)
    .where(eq(Users.phone, phone))
    .limit(1);

  if (!existingUser) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found");
  }

  // 🔹 Generate new OTP
  const otp = crypto.randomInt(1000, 9999).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  // 🔹 Update OTP
  await db
    .update(Users)
    .set({
      otp,
      expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(Users.phone, phone));

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "OTP resent successfully", {
      otp,
    }),
  );
});

export const refreshToken = asyncHandler(
  async (req: Request, res: Response) => {
    const refreshToken =
      req.cookies?.[REFRESH_TOKEN_COOKIE] || req.body.refreshToken;

    if (!refreshToken) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Refresh token is required");
    }

    const payload = await verifyRefreshToken(refreshToken);
    const tokens = await generateTokenPair({
      id: payload.id,
      role: payload.role,
    });

    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          "Tokens refreshed successfully",
          tokens,
        ),
      );
  },
);

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  clearAuthCookies(res);
  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, "Logged out successfully"));
});

// ================= CREATE PROFILE =================
export const createProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;

    if (!userId) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Please login first");
    }

    const {
      profileName,
      profileImg,
      profile_role = "ADULT",
      device_type = "UNKNOWN",
      genresIds = [],
      languagesIds = [],
      email,
      dob,
    } = req.body;

    if (!profileName) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Profile name is required");
    }

    // User exists check
    const [userExists] = await db
      .select({ id: Users.id })
      .from(Users)
      .where(and(eq(Users.id, userId), eq(Users.isDeleted, false)))
      .limit(1);

    if (!userExists) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found");
    }

    // Existing profiles count check karo
    const existingProfiles = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.userId, userId));

    const isFirstProfile = existingProfiles.length === 0;

    // First profile hai toh email & dob required hain
    if (isFirstProfile) {
      if (!email) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          "Email is required for the first profile",
        );
      }
      if (!dob) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          "Date of birth is required for the first profile",
        );
      }

      // Users table mein email & dob update karo
      await db
        .update(Users)
        .set({
          email,
          dob,
          updatedAt: new Date(),
        })
        .where(eq(Users.id, userId));
    }

    // Profile insert karo
    const [newProfile] = await db
      .insert(profiles)
      .values({
        userId,
        profileName,
        profileImg: profileImg || null,
        profile_role,
        device_type,
        genresIds,
        languagesIds,
      })
      .returning();

    return res
      .status(HTTP_STATUS.CREATED)
      .json(
        new ApiResponse(
          HTTP_STATUS.CREATED,
          isFirstProfile
            ? "First profile created successfully"
            : "Profile created successfully",
          newProfile,
        ),
      );
  },
);

// ================= GET PROFILES =================
export const getProfiles = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;

  if (!userId) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Please login first");
  }

  const userProfiles = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .orderBy(desc(profiles.createdAt));

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Profiles fetched successfully", {
      profiles: userProfiles,
      total: userProfiles.length,
    }),
  );
});

export const getGenres = asyncHandler(async (_req: Request, res: Response) => {
  const allGenres = await db.select().from(genres).orderBy(asc(genres.name));
  if (!allGenres || allGenres.length === 0) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "No genres found");
  }
  return res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, "Genres fetched successfully", allGenres),
    );
});

export const getLanguages = asyncHandler(
  async (_req: Request, res: Response) => {
    if (!languages) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Languages table not found");
    }
    const allLanguages = await db
      .select()
      .from(languages)
      .orderBy(asc(languages.name));
    if (!allLanguages || allLanguages.length === 0) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "No languages found");
    }
    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          "Languages fetched successfully",
          allLanguages,
        ),
      );
  },
);
