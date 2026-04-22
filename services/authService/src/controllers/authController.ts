import { and, desc, eq, gt,  asc } from "drizzle-orm";
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
import { db, Users, profiles, genres, languages,faqs,aboutUs,privacyPolicy,termsConditions } from "@digiiplex6112/db";
import { validate as isUUID } from "uuid";


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
const normalizeToArray = (value: any): string[] => {
  if (!value) return [];

  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch {
      return [value];
    }
  }

  return [];
};

const cleanUUIDArray = (arr: string[]) => {
  return arr.filter((id) => isUUID(id));
};

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
      email,
      dob,
    } = req.body;

    const genresIds = cleanUUIDArray(
      normalizeToArray(req.body.genresIds)
    );

    const languagesIds = cleanUUIDArray(
      normalizeToArray(req.body.languagesIds)
    );

    if (!profileName) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Profile name is required"
      );
    }

    const [userExists] = await db
      .select({ id: Users.id })
      .from(Users)
      .where(and(eq(Users.id, userId), eq(Users.isDeleted, false)))
      .limit(1);

    if (!userExists) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found");
    }

    //  Check existing profiles
    const existingProfiles = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.userId, userId));

    const isFirstProfile = existingProfiles.length === 0;

    if (isFirstProfile) {
      if (!email) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          "Email is required for the first profile"
        );
      }

      if (!dob) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          "Date of birth is required for the first profile"
        );
      }

      const [existingEmail] = await db
        .select({ id: Users.id })
        .from(Users)
        .where(eq(Users.email, email))
        .limit(1);

      if (existingEmail && existingEmail.id !== userId) {
        throw new ApiError(
          HTTP_STATUS.BAD_REQUEST,
          "Email already exists"
        );
      }

      try {
        await db
          .update(Users)
          .set({
            email,
            dob: dob || null,
            updatedAt: new Date(),
          })
          .where(eq(Users.id, userId));

      } catch (err: any) {
        //  PostgreSQL unique constraint
        if (err.code === "23505") {
          throw new ApiError(
            HTTP_STATUS.BAD_REQUEST,
            "Email already exists"
          );
        }

        throw new ApiError(
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          "Failed to update user"
        );
      }
    }

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

    return res.status(HTTP_STATUS.CREATED).json(
      new ApiResponse(
        HTTP_STATUS.CREATED,
        isFirstProfile
          ? "First profile created successfully"
          : "Profile created successfully",
        newProfile
      )
    );
  }
);

// export const createProfile = asyncHandler(
//   async (req: Request, res: Response) => {
//     const userId = (req as any).user?.id;

//     if (!userId) {
//       throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Please login first");
//     }

//     const {
//       profileName,
//       profileImg,
//       profile_role = "ADULT",
//       device_type = "UNKNOWN",
//       email,
//       dob,
//     } = req.body;

//     const genresIds = cleanUUIDArray(
//       normalizeToArray(req.body.genresIds)
//     );

//     const languagesIds = cleanUUIDArray(
//       normalizeToArray(req.body.languagesIds)
//     );

//     if (!profileName) {
//       throw new ApiError(
//         HTTP_STATUS.BAD_REQUEST,
//         "Profile name is required"
//       );
//     }

//     const [userExists] = await db
//       .select({ id: Users.id })
//       .from(Users)
//       .where(and(eq(Users.id, userId), eq(Users.isDeleted, false)))
//       .limit(1);

//     if (!userExists) {
//       throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found");
//     }

//     const existingProfiles = await db
//       .select({ id: profiles.id })
//       .from(profiles)
//       .where(eq(profiles.userId, userId));

//     const isFirstProfile = existingProfiles.length === 0;

//     if (isFirstProfile) {
//       if (!email) {
//         throw new ApiError(
//           HTTP_STATUS.BAD_REQUEST,
//           "Email is required for the first profile"
//         );
//       }

//       if (!dob) {
//         throw new ApiError(
//           HTTP_STATUS.BAD_REQUEST,
//           "Date of birth is required for the first profile"
//         );
//       }

//       await db
//         .update(Users)
//         .set({
//           email,
//           dob,
//           updatedAt: new Date(),
//         })
//         .where(eq(Users.id, userId));
//     }


//     const [newProfile] = await db
//       .insert(profiles)
//       .values({
//         userId,
//         profileName,
//         profileImg: profileImg || null,
//         profile_role,
//         device_type,
//         genresIds,
//         languagesIds,
//       })
//       .returning();

//     return res.status(HTTP_STATUS.CREATED).json(
//       new ApiResponse(
//         HTTP_STATUS.CREATED,
//         isFirstProfile
//           ? "First profile created successfully"
//           : "Profile created successfully",
//         newProfile
//       )
//     );
//   }
// );

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


// ================ FAQS =================  
export const getFaqs = asyncHandler(async (_req: Request, res: Response) => {
  const allFaqs = await db
    .select()
    .from(faqs)
    .orderBy(asc(faqs.createdAt));

  if (!allFaqs || allFaqs.length === 0) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "No FAQs found");
  }

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "FAQs fetched successfully", allFaqs)
  );
});

export const createFaq = asyncHandler(async (req: Request, res: Response) => {
  const { title, description } = req.body;
if(!title || !description) {
  throw new ApiError(HTTP_STATUS.BAD_REQUEST, "title and description are required");
}
  const newFaq = await db.insert(faqs).values({
    title,
    description,
  }).returning();

  return res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(HTTP_STATUS.CREATED, "FAQ created successfully", newFaq)
  );
});

export const updateFaq = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description } = req.body;
if(!title || !description) {
  throw new ApiError(HTTP_STATUS.BAD_REQUEST, "title and description are required");
}
  const safeId = Array.isArray(id) ? id[0] : id;

  const updated = await db
    .update(faqs)
    .set({ title, description, updatedAt: new Date() })
    .where(eq(faqs.id, safeId))
    .returning();

  if (!updated.length) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "FAQ not found");
  }

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "FAQ updated successfully", updated)
  );
});

export const deleteFaq = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const safeId = Array.isArray(id) ? id[0] : id;

  const deleted = await db
    .delete(faqs)
    .where(eq(faqs.id, safeId))
    .returning();

  if (!deleted.length) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "FAQ not found");
  }

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "FAQ deleted successfully", deleted)
  );
});

// about us
export const getAboutUs = asyncHandler(async (_req: Request, res: Response) => {
  const data = await db
    .select()
    .from(aboutUs)
    .orderBy(asc(aboutUs.createdAt));

  if (!data || data.length === 0) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "No About Us data found");
  }

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "About Us fetched successfully", data)
  );
});

export const createAboutUs = asyncHandler(async (req: Request, res: Response) => {
  const { title, description } = req.body;
if(!title || !description) {
  throw new ApiError(HTTP_STATUS.BAD_REQUEST, "title and description are required");
}
  const created = await db.insert(aboutUs).values({
    title,
    description,
  }).returning();

  return res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(HTTP_STATUS.CREATED, "About Us created successfully", created)
  );
});

export const updateAboutUs = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, isActive } = req.body;
  if(!title || !description) {
  throw new ApiError(HTTP_STATUS.BAD_REQUEST, "title and description are required");
}
  const safeId = Array.isArray(id) ? id[0] : id;

  const updated = await db
    .update(aboutUs)
    .set({
      title,
      description,
      isActive,
      updatedAt: new Date(),
    })
    .where(eq(aboutUs.id, safeId))
    .returning();

  if (!updated.length) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "About Us not found");
  }

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "About Us updated successfully", updated)
  );
});

export const deleteAboutUs = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const safeId = Array.isArray(id) ? id[0] : id;
  const deleted = await db
    .delete(aboutUs)
    .where(eq(aboutUs.id, safeId))
    .returning();

  if (!deleted.length) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "About Us not found");
  }

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "About Us deleted successfully", deleted)
  );
});

// privacy policy
export const getPrivacyPolicy = asyncHandler(async (_req: Request, res: Response) => {
  const data = await db
    .select()
    .from(privacyPolicy)
    .orderBy(asc(privacyPolicy.createdAt));

  if (!data || data.length === 0) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "No Privacy Policy found");
  }

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Privacy Policy fetched successfully", data)
  );
});

export const createPrivacyPolicy = asyncHandler(async (req: Request, res: Response) => {
  const { title, description } = req.body;
if(!title || !description) {
  throw new ApiError(HTTP_STATUS.BAD_REQUEST, "title and description are required");
}
  const created = await db.insert(privacyPolicy).values({
    title,
    description,
  }).returning();

  return res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(HTTP_STATUS.CREATED, "Privacy Policy created successfully", created)
  );
});

export const updatePrivacyPolicy = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, isActive } = req.body;
  if(!title || !description) {
  throw new ApiError(HTTP_STATUS.BAD_REQUEST, "title and description are required");
}
const safeId = Array.isArray(id) ? id[0] : id;
  const updated = await db
    .update(privacyPolicy)
    .set({
      title,
      description,
      isActive,
      updatedAt: new Date(),
    })
    .where(eq(privacyPolicy.id, safeId))
    .returning();

  if (!updated.length) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Privacy Policy not found");
  }

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Privacy Policy updated successfully", updated)
  );
});

export const deletePrivacyPolicy = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const safeId = Array.isArray(id) ? id[0] : id;
  const deleted = await db
    .delete(privacyPolicy)
    .where(eq(privacyPolicy.id, safeId))
    .returning();

  if (!deleted.length) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Privacy Policy not found");
  }

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Privacy Policy deleted successfully", deleted)
  );
});
// terms & conditions
export const getTermsConditions = asyncHandler(async (_req: Request, res: Response) => {
  const data = await db
    .select()
    .from(termsConditions)
    .orderBy(asc(termsConditions.createdAt));

  if (!data || data.length === 0) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "No Terms & Conditions found");
  }

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Terms & Conditions fetched successfully", data)
  );
});

export const createTermsConditions = asyncHandler(async (req: Request, res: Response) => {
  const { title, description } = req.body;
if(!title || !description) {
  throw new ApiError(HTTP_STATUS.BAD_REQUEST, "title and description are required");
}
  const created = await db.insert(termsConditions).values({
    title,
    description,
  }).returning();

  return res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(HTTP_STATUS.CREATED, "Terms & Conditions created successfully", created)
  );
});

export const updateTermsConditions = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, isActive } = req.body;
  if(!title || !description) {
  throw new ApiError(HTTP_STATUS.BAD_REQUEST, "title and description are required");
}
const safeId = Array.isArray(id) ? id[0] : id;
  const updated = await db
    .update(termsConditions)
    .set({
      title,
      description,
      isActive,
      updatedAt: new Date(),
    })
    .where(eq(termsConditions.id, safeId))
    .returning();

  if (!updated.length) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Terms & Conditions not found");
  }

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Terms & Conditions updated successfully", updated)
  );
});

export const deleteTermsConditions = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
const safeId = Array.isArray(id) ? id[0] : id;
  const deleted = await db
    .delete(termsConditions)
    .where(eq(termsConditions.id, safeId))
    .returning();

  if (!deleted.length) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Terms & Conditions not found");
  }

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Terms & Conditions deleted successfully", deleted)
  );
});