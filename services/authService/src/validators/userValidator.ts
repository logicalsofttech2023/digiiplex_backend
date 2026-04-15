import Joi from "joi";


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
    })
});

export const createProfileSchema = Joi.object({
    email: Joi.string().email().messages({
        "string.base": "Email must be a string",
        "string.email": "Email must be a valid email address",
    })
    .optional(),
    dob: Joi.string().messages({
        "string.base": "Date of birth must be a string",
    })
    .optional(),
    profileName: Joi.string().required().messages({
        "string.base": "Profile name must be a string",
        "any.required": "Profile name is required",
    }),
    profileImg: Joi.string().uri().messages({
        "string.base": "Profile image must be a valid URL",
    })
    .optional(),
    profile_role: Joi.string().valid("ADULT", "KID", "TEEN", "SENIOR").messages({
        "string.base": "Profile role must be a string",
        "any.only": "Profile role must be one of ADULT, KID, TEEN, SENIOR",
    })
    .optional(),
    device_type: Joi.string().valid("MOBILE", "WEB", "TV", "TABLET", "CONSOLE", "UNKNOWN").messages({
        "string.base": "Device type must be a string",
        "any.only": "Device type must be one of MOBILE, WEB, TV, TABLET, CONSOLE, UNKNOWN",
    })
    .optional(),
    genresIds: Joi.array().items(Joi.string()).messages({
        "array.base": "Genres IDs must be an array",
    })
    .optional(),
    languagesIds: Joi.array().items(Joi.string()).messages({
        "array.base": "Languages IDs must be an array",
    })
    .optional(),
});

