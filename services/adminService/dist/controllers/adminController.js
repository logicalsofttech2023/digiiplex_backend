import Admin from "../models/AdminModel.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HTTP_STATUS, MESSAGES } from "../constants/constant.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import bcrypt from "bcrypt";
import { generateToken } from "../utils/jwt.js";
export const createAdmin = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    if (!email || !password || !name) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "name, email and password are required");
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await Admin.create({ name, email, password: hashedPassword });
    res.status(HTTP_STATUS.CREATED).json(new ApiResponse(HTTP_STATUS.CREATED, MESSAGES.ADMIN.CREATED, {
        name: admin.name,
        email: admin.email,
        role: admin.role,
    }));
});
export const loginAdmin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "email and password are required");
    }
    const admin = await Admin.findOne({ email });
    if (!admin) {
        throw new ApiError(HTTP_STATUS.UNAUTHORIZED, MESSAGES.AUTH.INVALID_CREDENTIALS);
    }
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
        throw new ApiError(HTTP_STATUS.UNAUTHORIZED, MESSAGES.AUTH.INVALID_CREDENTIALS);
    }
    const token = await generateToken({ id: admin._id, role: admin.role });
    res
        .status(HTTP_STATUS.OK)
        .json(new ApiResponse(HTTP_STATUS.OK, MESSAGES.ADMIN.LOGIN_SUCCESS, token));
});
//# sourceMappingURL=AdminController.js.map