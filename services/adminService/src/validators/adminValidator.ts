import Joi from "joi";

export const createSuperAdminSchema = Joi.object({
    email: Joi.string().email().required().messages({
        "string.base": "Email must be a string",
        "string.email": "Email must be a valid email address",
        "any.required": "Email is required",
    }),
    password: Joi.string().min(8).required().messages({
        "string.base": "Password must be a string",
        "string.min": "Password must be at least 8 characters long",
        "any.required": "Password is required",
    }),
});

export const loginSuperAdminSchema = Joi.object({
    email: Joi.string().email().required().messages({
        "string.base": "Email must be a string",
        "string.email": "Email must be a valid email address",
        "any.required": "Email is required",
    }),
    password: Joi.string().min(8).required().messages({
        "string.base": "Password must be a string",
        "string.min": "Password must be at least 8 characters long",
        "any.required": "Password is required",
    }),
});

export const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string().required().messages({
        "string.base": "Refresh token must be a string",
        "any.required": "Refresh token is required",
    }),
});

export const getAdminByIdSchema = Joi.object({
    id: Joi.string().uuid().required().messages({
        "string.base": "ID must be a string",
        "string.uuid": "ID must be a valid UUID",
        "any.required": "ID is required",
    }),
});

export const getAllAdminsSchema = Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
        "number.base": "Page must be a number",
        "number.integer": "Page must be an integer",
        "number.min": "Page must be at least 1",
    }),
    limit: Joi.number().integer().min(1).max(100).default(10).messages({
        "number.base": "Limit must be a number",
        "number.integer": "Limit must be an integer",
        "number.min": "Limit must be at least 1",
        "number.max": "Limit must be at most 100",
    }),
    search: Joi.string().allow("").messages({
        "string.base": "Search must be a string",
    }),
});