import Joi from "joi";

const toArray = (value: any, helpers: any) => {
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

  return helpers.error("any.invalid");
};

export const generateOTPSchema = Joi.object({
  phone: Joi.number().required().messages({
    "any.required": "Phone number is required",
    "number.base": "Phone number must be a valid number",
  }),
});

export const verifyOTPSchema = Joi.object({
  phone: Joi.number().required().messages({
    "any.required": "Phone number is required",
    "number.base": "Phone number must be a valid number",
  }),
  otp: Joi.string().length(4).required().messages({
    "any.required": "OTP is required",
    "string.base": "OTP must be a string",
    "string.length": "OTP must be exactly 4 characters",
  }),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    "any.required": "Refresh token is required",
    "string.base": "Refresh token must be a string",
  }),
});

export const createProfileSchema = Joi.object({
  email: Joi.string().email().optional(),

  dob: Joi.string().optional(),

  profileName: Joi.string().required().messages({
    "any.required": "Profile name is required",
  }),

  profileImg: Joi.string().uri().optional(),

  profile_role: Joi.string()
    .valid("ADULT", "KID", "TEEN", "SENIOR")
    .optional(),

  device_type: Joi.string()
    .valid("MOBILE", "WEB", "TV", "TABLET", "CONSOLE", "UNKNOWN")
    .optional(),

  genresIds: Joi.any().custom(toArray).default([]),

  languagesIds: Joi.any().custom(toArray).default([]),
});
