import { Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import { AuthService } from "../services/authService.js";
import { generateToken } from "../utils/jwt.js";
import { HTTP_STATUS } from "../constants/constant.js";

// ✅ 1. Send OTP
export const sendOtp = asyncHandler(async (req, res: Response) => {
  const { phone } = req.body;

  if (!phone) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Phone is required");
  }

  const data = await AuthService.sendOtp(phone);

  return res.json(new ApiResponse(200, "OTP sent successfully", data));
});

// ✅ 2. Verify OTP
export const verifyOtp = asyncHandler(async (req, res: Response) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Phone and OTP are required");
  }

  const user = await AuthService.verifyOtp(phone, otp);

  const token = await generateToken({
    id: user.id,
    role: user.role,
  });

  return res.json(
    new ApiResponse(200, "OTP verified successfully", { token, user })
  );
});

// ✅ 3. Create Profile with User Details (fullName, email, dob, profileName, profileImg)
export const createProfileWithDetails = asyncHandler(async (req, res: Response) => {
  if (!req.user) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Unauthorized");
  }

  const userId = req.user.id;
  const { fullName, email, dob, profileName } = req.body;

  if (!fullName || !profileName || !email ||!dob) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "fullName and profileName ,email,dob are required"
    );
  }

  const result = await AuthService.createProfileWithDetails(userId, {
    fullName,
    email,
    dob,
    profileName,
    profileImg: req.file?.location, // optional: agar file upload ho to
  });

  return res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(HTTP_STATUS.CREATED, "Profile created successfully", result)
  );
});

// ✅ 4. Get All Profiles of User
export const getProfiles = asyncHandler(async (req, res: Response) => {

  if (!req.user) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Unauthorized");
  }

  const userId = req.user.id;
  const profiles = await AuthService.getProfiles(userId);

  return res.json(new ApiResponse(200, "Profiles fetched successfully", profiles));
});

// ✅ 5. Get Single Profile by ID (with Languages & Genres)
export const getProfile = asyncHandler(async (req, res: Response) => {
  if (!req.user) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Unauthorized");
  }

  let { profileId } = req.params;
  if (Array.isArray(profileId)) profileId = profileId[0]; // ✅ safe

  if (!profileId) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "profileId is required");
  }

  const profile = await AuthService.getProfile(profileId);
  return res.json(new ApiResponse(200, "Profile fetched successfully", profile));
});

// ✅ 6. Select Languages for Profile (Multiple)
export const selectLanguages = asyncHandler(async (req, res: Response) => {
  if (!req.user) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Unauthorized");
  }

  const { profileId, languageIds } = req.body;

  if (!profileId || !languageIds?.length) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "profileId and languageIds are required"
    );
  }

  const result = await AuthService.selectLanguages(profileId, languageIds);

  return res.json(new ApiResponse(200, "Languages selected successfully", result));
});

// ✅ 7. Select Genres for Profile (Multiple)
export const selectGenres = asyncHandler(async (req, res: Response) => {
  if (!req.user) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Unauthorized");
  }

  const { profileId, genreIds } = req.body;

  if (!profileId || !genreIds?.length) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "profileId and genreIds are required"
    );
  }

  const result = await AuthService.selectGenres(profileId, genreIds);

  return res.json(new ApiResponse(200, "Genres selected successfully", result));
});

// ✅ 8. Update Profile
export const updateProfile = asyncHandler(async (req, res: Response) => {
  if (!req.user) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Unauthorized");
  }

  // req.params.profileId type-safe fix
  let { profileId } = req.params;
  if (Array.isArray(profileId)) profileId = profileId[0];

  if (!profileId) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "profileId is required");
  }

  const { profileName, profileImg } = req.body;

  const profile = await AuthService.updateProfile(profileId, {
    profileName,
    profileImg: profileImg || req.file?.location, // agar image file upload hua ho
  });

  return res.json(new ApiResponse(200, "Profile updated successfully", profile));
});

// ✅ 9. Delete Profile
export const deleteProfile = asyncHandler(async (req, res: Response) => {
  if (!req.user) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Unauthorized");
  }

  // Type-safe fix for profileId
  let { profileId } = req.params;
  if (Array.isArray(profileId)) profileId = profileId[0]; // agar array aaya toh pehla use karo

  if (!profileId) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "profileId is required");
  }

  const result = await AuthService.deleteProfile(profileId);

  return res.json(new ApiResponse(200, "Profile deleted successfully", result));
});

// ✅ 10. Get User Details with all Profiles
export const getUser = asyncHandler(async (req, res: Response) => {
  if (!req.user) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Unauthorized");
  }

  const userId = req.user.id;
  const user = await AuthService.getUser(userId);

  return res.json(new ApiResponse(200, "User fetched successfully", user));
});