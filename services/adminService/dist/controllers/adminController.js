import { and, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HTTP_STATUS } from "../constants/constant.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import { deleteFromS3 } from "../utils/s3Delete.js";
import { db, Users, genres, languages } from "@digiiplex6112/db";
const ROLE_CONFIG = {
    SUPER_ADMIN: { label: "Super admin", role: "SUPER_ADMIN", listKey: "superAdmins" },
    ADMIN: { label: "Admin", role: "ADMIN", listKey: "admins" },
    CREATOR: { label: "Creator", role: "CREATOR", listKey: "creators" },
    USER: { label: "User", role: "USER", listKey: "users" },
};
const GENRE_CONFIG = {
    label: "Genre",
    listKey: "genres",
    table: genres,
};
const LANGUAGE_CONFIG = {
    label: "Language",
    listKey: "languages",
    table: languages,
};
const parseCount = (value) => Number(value ?? 0);
const getIdParam = (req) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Id is required");
    }
    return id;
};
const getPagination = (req) => {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 10, 1);
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    return { page, limit, search };
};
const parseBoolean = (value) => {
    if (value === undefined)
        return undefined;
    if (typeof value === "boolean")
        return value;
    if (typeof value === "string") {
        if (value.toLowerCase() === "true")
            return true;
        if (value.toLowerCase() === "false")
            return false;
    }
    return undefined;
};
const getUploadedFileLocation = (req) => {
    const file = req.file;
    return file?.location;
};
const buildUserResponse = (user) => ({
    id: user.id,
    phone: user.phone,
    email: user.email,
    dob: user.dob,
    authProvider: user.auth_provider,
    role: user.role,
    isVerified: user.isVerified,
    isActive: user.isActive,
    isDeleted: user.isDeleted,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
});
const ensureUniqueUserFields = async ({ phone, email, excludeId, }) => {
    if (phone) {
        const phoneFilters = [eq(Users.phone, phone)];
        if (excludeId)
            phoneFilters.push(ne(Users.id, excludeId));
        const [existingPhone] = await db
            .select({ id: Users.id })
            .from(Users)
            .where(and(...phoneFilters))
            .limit(1);
        if (existingPhone) {
            throw new ApiError(HTTP_STATUS.CONFLICT, "User with this phone already exists");
        }
    }
    if (email) {
        const emailFilters = [eq(Users.email, email)];
        if (excludeId)
            emailFilters.push(ne(Users.id, excludeId));
        const [existingEmail] = await db
            .select({ id: Users.id })
            .from(Users)
            .where(and(...emailFilters))
            .limit(1);
        if (existingEmail) {
            throw new ApiError(HTTP_STATUS.CONFLICT, "User with this email already exists");
        }
    }
};
const buildCreateUserValues = (req, role) => {
    const phone = typeof req.body.phone === "string" ? req.body.phone.trim() : "";
    const email = typeof req.body.email === "string" && req.body.email.trim()
        ? req.body.email.trim()
        : null;
    const dob = typeof req.body.dob === "string" && req.body.dob.trim()
        ? req.body.dob.trim()
        : null;
    const authProvider = typeof req.body.authProvider === "string" && req.body.authProvider.trim()
        ? req.body.authProvider.trim().toUpperCase()
        : undefined;
    const isVerified = parseBoolean(req.body.isVerified);
    const isActive = parseBoolean(req.body.isActive);
    const isDeleted = parseBoolean(req.body.isDeleted);
    if (!phone) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "phone is required");
    }
    return {
        phone,
        email,
        dob,
        role,
        ...(authProvider
            ? { auth_provider: authProvider }
            : {}),
        ...(isVerified !== undefined ? { isVerified } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        ...(isDeleted !== undefined ? { isDeleted } : {}),
    };
};
const buildUpdateUserValues = (req, role) => {
    const updateData = {
        role,
        updatedAt: new Date(),
    };
    if (typeof req.body.phone === "string") {
        const phone = req.body.phone.trim();
        if (!phone) {
            throw new ApiError(HTTP_STATUS.BAD_REQUEST, "phone cannot be empty");
        }
        updateData.phone = phone;
    }
    if (req.body.email !== undefined) {
        if (typeof req.body.email !== "string") {
            throw new ApiError(HTTP_STATUS.BAD_REQUEST, "email must be a string");
        }
        updateData.email = req.body.email.trim() || null;
    }
    if (req.body.dob !== undefined) {
        if (typeof req.body.dob !== "string") {
            throw new ApiError(HTTP_STATUS.BAD_REQUEST, "dob must be a string");
        }
        updateData.dob = req.body.dob.trim() || null;
    }
    if (req.body.authProvider !== undefined) {
        if (typeof req.body.authProvider !== "string" ||
            !req.body.authProvider.trim()) {
            throw new ApiError(HTTP_STATUS.BAD_REQUEST, "authProvider must be a non-empty string");
        }
        updateData.auth_provider =
            req.body.authProvider.trim().toUpperCase();
    }
    const isVerified = parseBoolean(req.body.isVerified);
    if (isVerified !== undefined)
        updateData.isVerified = isVerified;
    const isActive = parseBoolean(req.body.isActive);
    if (isActive !== undefined)
        updateData.isActive = isActive;
    const isDeleted = parseBoolean(req.body.isDeleted);
    if (isDeleted !== undefined)
        updateData.isDeleted = isDeleted;
    return updateData;
};
const getManagedUserById = async (id, role) => {
    const [user] = await db
        .select()
        .from(Users)
        .where(and(eq(Users.id, id), eq(Users.role, role)))
        .limit(1);
    return user;
};
const createManagedUser = (config) => asyncHandler(async (req, res) => {
    const values = buildCreateUserValues(req, config.role);
    await ensureUniqueUserFields({ phone: values.phone, email: values.email });
    const [user] = await db.insert(Users).values(values).returning();
    res.status(HTTP_STATUS.CREATED).json(new ApiResponse(HTTP_STATUS.CREATED, `${config.label} created successfully`, { user: buildUserResponse(user) }));
});
const getManagedUsers = (config) => asyncHandler(async (req, res) => {
    const { page, limit, search } = getPagination(req);
    let whereClause = eq(Users.role, config.role);
    if (search) {
        whereClause = and(whereClause, or(ilike(Users.phone, `%${search}%`), ilike(sql `coalesce(${Users.email}, '')`, `%${search}%`), ilike(sql `coalesce(${Users.dob}, '')`, `%${search}%`)));
    }
    const [{ count }] = await db
        .select({ count: sql `count(*)` })
        .from(Users)
        .where(whereClause);
    const rows = await db
        .select()
        .from(Users)
        .where(whereClause)
        .orderBy(desc(Users.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, `${config.label}s fetched successfully`, {
        [config.listKey]: rows.map(buildUserResponse),
        pagination: {
            total: parseCount(count),
            page,
            limit,
            totalPages: Math.ceil(parseCount(count) / limit),
        },
    }));
});
const getManagedUser = (config) => asyncHandler(async (req, res) => {
    const id = getIdParam(req);
    const user = await getManagedUserById(id, config.role);
    if (!user) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, `${config.label} not found`);
    }
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, `${config.label} fetched successfully`, {
        user: buildUserResponse(user),
    }));
});
const updateManagedUser = (config) => asyncHandler(async (req, res) => {
    const id = getIdParam(req);
    const existingUser = await getManagedUserById(id, config.role);
    if (!existingUser) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, `${config.label} not found`);
    }
    const updateData = buildUpdateUserValues(req, config.role);
    await ensureUniqueUserFields({
        phone: updateData.phone,
        email: updateData.email,
        excludeId: id,
    });
    const [user] = await db
        .update(Users)
        .set(updateData)
        .where(eq(Users.id, id))
        .returning();
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, `${config.label} updated successfully`, { user: buildUserResponse(user) }));
});
const deleteManagedUser = (config) => asyncHandler(async (req, res) => {
    const id = getIdParam(req);
    const existingUser = await getManagedUserById(id, config.role);
    if (!existingUser) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, `${config.label} not found`);
    }
    await db.delete(Users).where(eq(Users.id, id));
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, `${config.label} deleted successfully`));
});
const createAssetEntity = (config) => asyncHandler(async (req, res) => {
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const image = getUploadedFileLocation(req);
    if (!name) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "name is required");
    }
    if (!image) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, "image is required");
    }
    const [existing] = await db
        .select({ id: config.table.id })
        .from(config.table)
        .where(eq(config.table.name, name))
        .limit(1);
    if (existing) {
        throw new ApiError(HTTP_STATUS.CONFLICT, `${config.label} with this name already exists`);
    }
    const [record] = await db
        .insert(config.table)
        .values({ name, image })
        .returning();
    res.status(HTTP_STATUS.CREATED).json(new ApiResponse(HTTP_STATUS.CREATED, `${config.label} created successfully`, { [config.label.toLowerCase()]: record }));
});
const getAssetEntities = (config) => asyncHandler(async (req, res) => {
    const { page, limit, search } = getPagination(req);
    const isActive = parseBoolean(req.query.isActive);
    let whereClause = search ? ilike(config.table.name, `%${search}%`) : undefined;
    if (isActive !== undefined) {
        whereClause = whereClause
            ? and(whereClause, eq(config.table.isActive, isActive))
            : eq(config.table.isActive, isActive);
    }
    const [{ count }] = await db
        .select({ count: sql `count(*)` })
        .from(config.table)
        .where(whereClause);
    const rows = await db
        .select()
        .from(config.table)
        .where(whereClause)
        .orderBy(desc(config.table.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, `${config.label}s fetched successfully`, {
        [config.listKey]: rows,
        pagination: {
            total: parseCount(count),
            page,
            limit,
            totalPages: Math.ceil(parseCount(count) / limit),
        },
    }));
});
const getAssetEntity = (config) => asyncHandler(async (req, res) => {
    const id = getIdParam(req);
    const [record] = await db
        .select()
        .from(config.table)
        .where(eq(config.table.id, id))
        .limit(1);
    if (!record) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, `${config.label} not found`);
    }
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, `${config.label} fetched successfully`, {
        [config.label.toLowerCase()]: record,
    }));
});
const updateAssetEntity = (config) => asyncHandler(async (req, res) => {
    const id = getIdParam(req);
    const image = getUploadedFileLocation(req);
    const [existing] = await db
        .select()
        .from(config.table)
        .where(eq(config.table.id, id))
        .limit(1);
    if (!existing) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, `${config.label} not found`);
    }
    const updateData = {
        updatedAt: new Date(),
    };
    if (typeof req.body.name === "string") {
        const name = req.body.name.trim();
        if (!name) {
            throw new ApiError(HTTP_STATUS.BAD_REQUEST, "name cannot be empty");
        }
        const [duplicate] = await db
            .select({ id: config.table.id })
            .from(config.table)
            .where(and(eq(config.table.name, name), ne(config.table.id, id)))
            .limit(1);
        if (duplicate) {
            throw new ApiError(HTTP_STATUS.CONFLICT, `${config.label} with this name already exists`);
        }
        updateData.name = name;
    }
    const isActive = parseBoolean(req.body.isActive);
    if (isActive !== undefined)
        updateData.isActive = isActive;
    if (image) {
        updateData.image = image;
        if (existing.image) {
            await deleteFromS3(existing.image);
        }
    }
    const [record] = await db
        .update(config.table)
        .set(updateData)
        .where(eq(config.table.id, id))
        .returning();
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, `${config.label} updated successfully`, { [config.label.toLowerCase()]: record }));
});
const deleteAssetEntity = (config) => asyncHandler(async (req, res) => {
    const id = getIdParam(req);
    const [existing] = await db
        .select()
        .from(config.table)
        .where(eq(config.table.id, id))
        .limit(1);
    if (!existing) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, `${config.label} not found`);
    }
    if (existing.image) {
        await deleteFromS3(existing.image);
    }
    await db.delete(config.table).where(eq(config.table.id, id));
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, `${config.label} deleted successfully`));
});
export const createSuperAdmin = createManagedUser(ROLE_CONFIG.SUPER_ADMIN);
export const getAllSuperAdmins = getManagedUsers(ROLE_CONFIG.SUPER_ADMIN);
export const getSuperAdminById = getManagedUser(ROLE_CONFIG.SUPER_ADMIN);
export const updateSuperAdmin = updateManagedUser(ROLE_CONFIG.SUPER_ADMIN);
export const deleteSuperAdmin = deleteManagedUser(ROLE_CONFIG.SUPER_ADMIN);
export const createAdmin = createManagedUser(ROLE_CONFIG.ADMIN);
export const getAllAdmins = getManagedUsers(ROLE_CONFIG.ADMIN);
export const getAdminById = getManagedUser(ROLE_CONFIG.ADMIN);
export const updateAdmin = updateManagedUser(ROLE_CONFIG.ADMIN);
export const deleteAdmin = deleteManagedUser(ROLE_CONFIG.ADMIN);
export const createCreator = createManagedUser(ROLE_CONFIG.CREATOR);
export const getAllCreators = getManagedUsers(ROLE_CONFIG.CREATOR);
export const getCreatorById = getManagedUser(ROLE_CONFIG.CREATOR);
export const updateCreator = updateManagedUser(ROLE_CONFIG.CREATOR);
export const deleteCreator = deleteManagedUser(ROLE_CONFIG.CREATOR);
export const createUser = createManagedUser(ROLE_CONFIG.USER);
export const getAllUsers = getManagedUsers(ROLE_CONFIG.USER);
export const getUserById = getManagedUser(ROLE_CONFIG.USER);
export const updateUser = updateManagedUser(ROLE_CONFIG.USER);
export const deleteUser = deleteManagedUser(ROLE_CONFIG.USER);
export const createGenre = createAssetEntity(GENRE_CONFIG);
export const getAllGenres = getAssetEntities(GENRE_CONFIG);
export const getGenreById = getAssetEntity(GENRE_CONFIG);
export const updateGenre = updateAssetEntity(GENRE_CONFIG);
export const deleteGenre = deleteAssetEntity(GENRE_CONFIG);
export const createLanguage = createAssetEntity(LANGUAGE_CONFIG);
export const getAllLanguages = getAssetEntities(LANGUAGE_CONFIG);
export const getLanguageById = getAssetEntity(LANGUAGE_CONFIG);
export const updateLanguage = updateAssetEntity(LANGUAGE_CONFIG);
export const deleteLanguage = deleteAssetEntity(LANGUAGE_CONFIG);
//# sourceMappingURL=AdminController.js.map