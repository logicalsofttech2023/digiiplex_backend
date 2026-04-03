import { eq, and } from "drizzle-orm";
import { db } from "../config/db.js";
import { authUsers, profiles, profileLanguages, profileGenres } from "../db/schema.js";
import ApiError from "../utils/ApiError.js";

const OTP_EXPIRY_MINUTES = 5;

export const AuthService = {
  // 1️⃣ Send OTP
  async sendOtp(phone: string) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Check if user exists
    const existingUser = await db.query.authUsers.findFirst({
      where: eq(authUsers.phone, phone),
    });

    if (existingUser) {
      // Update existing user with new OTP
      await db
        .update(authUsers)
        .set({
          otp: otp,
          expiresAt: expiresAt,
          verified: false,
          updatedAt: new Date(),
        })
        .where(eq(authUsers.phone, phone));
    } else {
      // Create new user with OTP
      await db.insert(authUsers).values({
        phone: phone,
        otp: otp,
        expiresAt: expiresAt,
        verified: false,
        isVerified: false,
        isActive: true,
        isDeleted: false,
        role: "user",
      });
    }

    return { phone,otp };
  },

  // 2️⃣ Verify OTP
  async verifyOtp(phone: string, otp: string) {
    const user = await db.query.authUsers.findFirst({
      where: and(
        eq(authUsers.phone, phone),
        eq(authUsers.verified, false),
        eq(authUsers.isDeleted, false)
      ),
    });

    if (!user) {
      throw new ApiError(404, "User not found or already verified");
    }

    if (user.otp !== otp) {
      throw new ApiError(400, "Invalid OTP");
    }

    if (new Date() > user.expiresAt) {
      throw new ApiError(400, "OTP expired");
    }

    // Mark user as verified
    const [updatedUser] = await db
      .update(authUsers)
      .set({
        verified: true,
        isVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(authUsers.id, user.id))
      .returning();

    return updatedUser;
  },

  // 3️⃣ Create Profile with User Details (TRANSACTION - Ek hi step mein)
  async createProfileWithDetails(
    userId: string,
    data: {
      fullName: string;
      email?: string;
      dob?: string;
      profileName: string;
      profileImg?: string;
    }
  ) {
    const { fullName, email, dob, profileName, profileImg } = data;

    return await db.transaction(async (tx) => {
      // Step 1: Update user with fullName, email, dob
      const [user] = await tx
        .update(authUsers)
        .set({
          fullName,
          email,
          dob,
          updatedAt: new Date(),
        })
        .where(eq(authUsers.id, userId))
        .returning();

      if (!user) {
        throw new ApiError(404, "User not found");
      }

      // Step 2: Create profile
      const [profile] = await tx
        .insert(profiles)
        .values({
          userId,
          profileName,
          profileImg: profileImg || null,
        })
        .returning();

      return {
        user: {
          id: user.id,
          phone: user.phone,
          fullName: user.fullName,
          email: user.email,
          dob: user.dob,
          role: user.role,
          isVerified: user.isVerified,
        },
        profile: {
          id: profile.id,
          profileName: profile.profileName,
          profileImg: profile.profileImg,
        },
      };
    });
  },

  // 4️⃣ Get All Profiles of a User
async getProfiles(userId: string) {
  const allProfiles = await db.query.profiles.findMany({
    where: eq(profiles.userId, userId),
    with: { profileLanguages: true, profileGenres: true },
  });

  return allProfiles;
},

  // 5️⃣ Get Single Profile with Languages & Genres
  async getProfile(profileId: string) {
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, profileId),
      with: {
        profileLanguages: true,
        profileGenres: true,
      },
    });

    if (!profile) {
      throw new ApiError(404, "Profile not found");
    }

    return profile;
  },

  // 6️⃣ Select Languages for a Profile (Multiple)
  async selectLanguages(profileId: string, languageIds: string[]) {
    // Check if profile exists
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, profileId),
    });

    if (!profile) {
      throw new ApiError(404, "Profile not found");
    }

    if (!languageIds || languageIds.length === 0) {
      throw new ApiError(400, "At least one languageId required");
    }

    // Delete old languages
    await db
      .delete(profileLanguages)
      .where(eq(profileLanguages.profileId, profileId));

    // Insert new languages
    await db.insert(profileLanguages).values(
      languageIds.map((languageId) => ({
        profileId,
        languageId,
      }))
    );

    return { success: true, message: "Languages updated successfully" };
  },

  // 7️⃣ Select Genres for a Profile (Multiple)
  async selectGenres(profileId: string, genreIds: string[]) {
    // Check if profile exists
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, profileId),
    });

    if (!profile) {
      throw new ApiError(404, "Profile not found");
    }

    if (!genreIds || genreIds.length === 0) {
      throw new ApiError(400, "At least one genreId required");
    }

    // Delete old genres
    await db
      .delete(profileGenres)
      .where(eq(profileGenres.profileId, profileId));

    // Insert new genres
    await db.insert(profileGenres).values(
      genreIds.map((genreId) => ({
        profileId,
        genreId,
      }))
    );

    return { success: true, message: "Genres updated successfully" };
  },

  // 8️⃣ Update Profile
  async updateProfile(
    profileId: string,
    data: {
      profileName?: string;
      profileImg?: string;
    }
  ) {
    const [updatedProfile] = await db
      .update(profiles)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, profileId))
      .returning();

    if (!updatedProfile) {
      throw new ApiError(404, "Profile not found");
    }

    return updatedProfile;
  },

  // 9️⃣ Delete Profile
  async deleteProfile(profileId: string) {
    // First delete related languages and genres
    await db.delete(profileLanguages).where(eq(profileLanguages.profileId, profileId));
    await db.delete(profileGenres).where(eq(profileGenres.profileId, profileId));
    
    // Then delete profile
    const [deletedProfile] = await db
      .delete(profiles)
      .where(eq(profiles.id, profileId))
      .returning();

    if (!deletedProfile) {
      throw new ApiError(404, "Profile not found");
    }

    return { success: true, message: "Profile deleted successfully" };
  },

  // 🔟 Get User Details with Profiles
  async getUser(userId: string) {
    const user = await db.query.authUsers.findFirst({
      where: and(
        eq(authUsers.id, userId),
        eq(authUsers.isDeleted, false)
      ),
      with: {
        profiles: {
          with: {
            profileLanguages: true,
            profileGenres: true,
          },
        },
      },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return user;
  },
};