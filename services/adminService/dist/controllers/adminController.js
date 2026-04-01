import { and, desc, eq, gt, ilike, or, sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HTTP_STATUS, MESSAGES, FRONTEND_URL } from "../constants/constant.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import { generateToken } from "../utils/jwt.js";
import { deleteFromS3 } from "../utils/s3Delete.js";
import { db } from "../config/db.js";
import { admins, creators, genres, languages } from "../db/schema.js";
import { decryptPassword, encryptPassword, verifyPassword, } from "../utils/encryption.js";
import { sendEmail } from "../config/sendEmail.js";
const parseCount = (value) => Number(value ?? 0);
export const createAdmin = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    if (!email || !password || !name) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "name, email and password are required");
    }
    const existingAdmin = await db.query.admins.findFirst({
        where: eq(admins.email, email),
    });
    if (existingAdmin) {
        throw new ApiError(HTTP_STATUS.CONFLICT, "Admin with this email already exists");
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const [admin] = await db
        .insert(admins)
        .values({
        name,
        email,
        password: hashedPassword,
        role: "admin",
        updatedAt: new Date(),
    })
        .returning();
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
    const admin = await db.query.admins.findFirst({
        where: eq(admins.email, email),
    });
    if (!admin) {
        throw new ApiError(HTTP_STATUS.UNAUTHORIZED, MESSAGES.AUTH.INVALID_CREDENTIALS);
    }
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
        throw new ApiError(HTTP_STATUS.UNAUTHORIZED, MESSAGES.AUTH.INVALID_CREDENTIALS);
    }
    const token = await generateToken({ id: admin.id, role: admin.role });
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, MESSAGES.ADMIN.LOGIN_SUCCESS, { token }));
});
export const createCreator = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    if (!email || !password || !name) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "name, email and password are required");
    }
    const existing = await db.query.creators.findFirst({
        where: eq(creators.email, email),
    });
    if (existing) {
        throw new ApiError(HTTP_STATUS.CONFLICT, MESSAGES.CREATOR.ALREADY_EXISTS);
    }
    const [creator] = await db
        .insert(creators)
        .values({
        name,
        email,
        password: encryptPassword(password),
        role: "creator",
        emailVerified: false,
        updatedAt: new Date(),
    })
        .returning();
    res.status(HTTP_STATUS.CREATED).json(new ApiResponse(HTTP_STATUS.CREATED, MESSAGES.CREATOR.CREATED, {
        name: creator.name,
        email: creator.email,
        role: creator.role,
    }));
});
export const updateCreator = asyncHandler(async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Creator id is required");
    }
    const { name, email } = req.body;
    const existingCreator = await db.query.creators.findFirst({
        where: eq(creators.id, id),
    });
    if (!existingCreator) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Creator not found");
    }
    const [updatedCreator] = await db
        .update(creators)
        .set({
        name: name ?? existingCreator.name,
        email: email ?? existingCreator.email,
        updatedAt: new Date(),
    })
        .where(eq(creators.id, id))
        .returning();
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Creator updated successfully", updatedCreator));
});
export const deleteCreator = asyncHandler(async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Creator id is required");
    }
    const existingCreator = await db.query.creators.findFirst({
        where: eq(creators.id, id),
    });
    if (!existingCreator) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Creator not found");
    }
    await db.delete(creators).where(eq(creators.id, id));
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Creator deleted successfully", null));
});
export const getAllCreator = asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search || "";
    const whereClause = search
        ? or(ilike(creators.name, `%${search}%`), ilike(creators.email, `%${search}%`))
        : undefined;
    const [{ count }] = await db
        .select({ count: sql `count(*)` })
        .from(creators)
        .where(whereClause);
    const creatorRows = await db
        .select()
        .from(creators)
        .where(whereClause)
        .orderBy(desc(creators.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);
    const decryptedCreators = creatorRows.map((creator) => ({
        ...creator,
        password: creator.password ? decryptPassword(creator.password) : null,
    }));
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Creators fetched successfully", {
        creators: decryptedCreators,
        pagination: {
            total: parseCount(count),
            page,
            limit,
            totalPages: Math.ceil(parseCount(count) / limit),
        },
    }));
});
export const loginCreator = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Email and password are required");
    }
    const creator = await db.query.creators.findFirst({
        where: eq(creators.email, email),
    });
    if (!creator || !verifyPassword(password, creator.password)) {
        throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid credentials");
    }
    if (!creator.emailVerified) {
        const token = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
        await db
            .update(creators)
            .set({
            emailVerificationToken: hashedToken,
            emailVerificationExpires: new Date(Date.now() + 10 * 60 * 1000),
            updatedAt: new Date(),
        })
            .where(eq(creators.id, creator.id));
        const verifyUrl = `${FRONTEND_URL}/verify-email/${token}`;
        await sendEmail(creator.email, "Verify your email", `<h2>Email Verification</h2>
         <p>Click below to verify your email:</p>
         <a href="${verifyUrl}">Verify Email</a>`);
        return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Verification email sent. Please verify first."));
    }
    const jwtToken = await generateToken({
        id: creator.id,
        role: creator.role ?? "creator",
    });
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, MESSAGES.CREATOR.LOGIN_SUCCESS, {
        token: jwtToken,
    }));
});
export const verifyEmail = asyncHandler(async (req, res) => {
    const { token } = req.query;
    if (!token || typeof token !== "string") {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Token is required");
    }
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const creator = await db.query.creators.findFirst({
        where: and(eq(creators.emailVerificationToken, hashedToken), gt(creators.emailVerificationExpires, new Date())),
    });
    if (!creator) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Invalid or expired token");
    }
    const [updatedCreator] = await db
        .update(creators)
        .set({
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        updatedAt: new Date(),
    })
        .where(eq(creators.id, creator.id))
        .returning();
    const jwtToken = await generateToken({
        id: updatedCreator.id,
        role: updatedCreator.role ?? "creator",
    });
    return res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Email verified successfully", {
        token: jwtToken,
    }));
});
export const createGenre = asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!req.file || !name) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "name and image are required");
    }
    const existingGenre = await db.query.genres.findFirst({
        where: eq(genres.name, name),
    });
    if (existingGenre) {
        throw new ApiError(HTTP_STATUS.CONFLICT, "Genre name already exists");
    }
    await db.insert(genres).values({
        name,
        image: req.file.location,
        updatedAt: new Date(),
    });
    return res
        .status(HTTP_STATUS.CREATED)
        .json(new ApiResponse(HTTP_STATUS.CREATED, "Genre created successfully"));
});
export const updateGenre = asyncHandler(async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { name } = req.body;
    if (!id) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "id is required");
    }
    const genre = await db.query.genres.findFirst({
        where: eq(genres.id, id),
    });
    if (!genre) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Genre not found");
    }
    let imageUrl = genre.image;
    if (req.file) {
        if (genre.image) {
            await deleteFromS3(genre.image);
        }
        imageUrl = req.file.location;
    }
    const [updatedGenre] = await db
        .update(genres)
        .set({
        name: name ?? genre.name,
        image: imageUrl,
        updatedAt: new Date(),
    })
        .where(eq(genres.id, id))
        .returning();
    return res.json(new ApiResponse(HTTP_STATUS.OK, "Genre updated successfully", updatedGenre));
});
export const deleteGenre = asyncHandler(async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "id is required");
    }
    const genre = await db.query.genres.findFirst({
        where: eq(genres.id, id),
    });
    if (!genre) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Genre not found");
    }
    if (genre.image) {
        await deleteFromS3(genre.image);
    }
    await db.delete(genres).where(eq(genres.id, id));
    return res.json(new ApiResponse(HTTP_STATUS.OK, "Genre deleted successfully", null));
});
export const getAllGenres = asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search || "";
    const whereClause = search ? ilike(genres.name, `%${search}%`) : undefined;
    const [{ count }] = await db
        .select({ count: sql `count(*)` })
        .from(genres)
        .where(whereClause);
    const genreRows = await db
        .select()
        .from(genres)
        .where(whereClause)
        .orderBy(desc(genres.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Genres fetched successfully", {
        data: genreRows,
        pagination: {
            total: parseCount(count),
            page,
            limit,
            totalPages: Math.ceil(parseCount(count) / limit),
        },
    }));
});
export const createLanguage = asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!req.file || !name) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "name and image are required");
    }
    const existingLanguage = await db.query.languages.findFirst({
        where: eq(languages.name, name),
    });
    if (existingLanguage) {
        throw new ApiError(HTTP_STATUS.CONFLICT, "Language name already exists");
    }
    const [language] = await db
        .insert(languages)
        .values({
        name,
        image: req.file.location,
        updatedAt: new Date(),
    })
        .returning();
    return res.status(HTTP_STATUS.CREATED).json(new ApiResponse(HTTP_STATUS.CREATED, "Language created successfully", language));
});
export const updateLanguage = asyncHandler(async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { name } = req.body;
    if (!id) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "id is required");
    }
    const existingLanguage = await db.query.languages.findFirst({
        where: eq(languages.id, id),
    });
    if (!existingLanguage) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Language not found");
    }
    let imageUrl = existingLanguage.image;
    if (req.file) {
        if (existingLanguage.image) {
            await deleteFromS3(existingLanguage.image);
        }
        imageUrl = req.file.location;
    }
    const [updatedLanguage] = await db
        .update(languages)
        .set({
        name: name ?? existingLanguage.name,
        image: imageUrl,
        updatedAt: new Date(),
    })
        .where(eq(languages.id, id))
        .returning();
    return res.json(new ApiResponse(HTTP_STATUS.OK, "Language updated successfully", updatedLanguage));
});
export const deleteLanguage = asyncHandler(async (req, res) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "id is required");
    }
    const existingLanguage = await db.query.languages.findFirst({
        where: eq(languages.id, id),
    });
    if (!existingLanguage) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, "Language not found");
    }
    if (existingLanguage.image) {
        await deleteFromS3(existingLanguage.image);
    }
    await db.delete(languages).where(eq(languages.id, id));
    return res.json(new ApiResponse(HTTP_STATUS.OK, "Language deleted successfully", null));
});
export const getAllLanguages = asyncHandler(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search || "";
    const whereClause = search
        ? ilike(languages.name, `%${search}%`)
        : undefined;
    const [{ count }] = await db
        .select({ count: sql `count(*)` })
        .from(languages)
        .where(whereClause);
    const languageRows = await db
        .select()
        .from(languages)
        .where(whereClause)
        .orderBy(desc(languages.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, "Languages fetched successfully", {
        languages: languageRows,
        pagination: {
            total: parseCount(count),
            page,
            limit,
            totalPages: Math.ceil(parseCount(count) / limit),
        },
    }));
});
//# sourceMappingURL=AdminController.js.map