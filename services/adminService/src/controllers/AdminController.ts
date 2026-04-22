import { and, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HTTP_STATUS } from "../constants/constant.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import { deleteFromS3 } from "../utils/s3Delete.js";
import { db, Users, genres, languages, profiles, uploads, uploadAssets, videos, videoAssets } from "@digiiplex6112/db";
import { generateTokenPair, verifyRefreshToken } from "../utils/jwt.js";
import { sendEmail } from "../config/sendEmail.js";
import {
  clearAuthCookies,
  REFRESH_TOKEN_COOKIE,
  setAuthCookies,
} from "../utils/authCookies.js";
const parseCount = (value: unknown) => Number(value ?? 0);



// ==================== Super Admin ====================

export const createSuperAdmin = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Email and password are required",
      );
    }

    const existingAdmin = await db.query.Users.findFirst({
      where: eq(Users.email, email),
    });

    if (existingAdmin) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        "Admin with this email already exists",
      );
    }

    const [admin] = await db
      .insert(Users)
      .values({
        email,
        password,
        role: "SUPER_ADMIN",
      })
      .returning();

    return res.status(HTTP_STATUS.CREATED).json(
      new ApiResponse(HTTP_STATUS.CREATED, "Super admin created successfully", {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      }),
    );
  },
);

export const loginSuperAdmin = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Email and password are required",
      );
    }

    const admin = await db.query.Users.findFirst({
      where: and(eq(Users.email, email), eq(Users.role, "SUPER_ADMIN")),
    });

    if (!admin || admin.password !== password) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid email or password");
    }

    const tokens = await generateTokenPair({
      id: admin.id,
      role: admin.role || "SUPER_ADMIN",
    });

    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, "Super admin logged in successfully", {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        ...tokens,
      }),
    );
  },
);

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

export const logout = asyncHandler(async (req: Request, res: Response) => {
  clearAuthCookies(res);
  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, "Logged out successfully"));
});

// ==================== Admin ====================

export const createAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const existingAdmin = await db.query.Users.findFirst({
    where: eq(Users.email, email),
  });

  if (existingAdmin) {
    throw new ApiError(
      HTTP_STATUS.CONFLICT,
      "Admin with this email already exists",
    );
  }

  const [admin] = await db
    .insert(Users)
    .values({
      email,
      password,
      role: "ADMIN",
    })
    .returning();

  return res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(HTTP_STATUS.CREATED, "Admin created successfully", {
      id: admin.id,
      email: admin.email,
      role: admin.role,
    }),
  );
});

export const loginAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const admin = await db.query.Users.findFirst({
    where: and(eq(Users.email, email), eq(Users.role, "ADMIN")),
  });

  if (!admin || admin.password !== password) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid email or password");
  }

  const tokens = await generateTokenPair({
    id: admin.id,
    role: admin.role || "ADMIN",
  });

  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Admin logged in successfully", {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      ...tokens,
    }),
  );
});

export const getAdminById = asyncHandler(
  async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const admin = await db.query.Users.findFirst({
      where: eq(Users.id, id),
    });

    if (!admin) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Admin not found");
    }

    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, "Admin fetched successfully", {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      }),
    );
  },
);

export const getAllAdmins = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = (req.query.search as string) || "";

    const offset = (page - 1) * limit;

    const searchCondition = search
      ? or(ilike(Users.email, `%${search}%`))
      : undefined;

    const whereCondition = searchCondition
      ? and(eq(Users.role, "ADMIN"), searchCondition)
      : eq(Users.role, "ADMIN");

    const admins = await db.query.Users.findMany({
      where: whereCondition,
      limit,
      offset,
    });

    const totalAdmins = await db.query.Users.findMany({
      where: whereCondition,
    });

    if (!admins || admins.length === 0) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "No admins found");
    }

    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, "Admins fetched successfully", {
        data: admins.map((admin) => ({
          id: admin.id,
          email: admin.email,
          role: admin.role,
        })),
        pagination: {
          total: totalAdmins.length,
          page,
          limit,
          totalPages: Math.ceil(totalAdmins.length / limit),
        },
      }),
    );
  },
);

export const updateAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { email, password } = req.body;

  // Check if admin exists
  const existingAdmin = await db.query.Users.findFirst({
    where: eq(Users.id, id),
  });

  if (!existingAdmin) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Admin not found");
  }

  if (email && email !== existingAdmin.email) {
    const emailExists = await db.query.Users.findFirst({
      where: eq(Users.email, email),
    });

    if (emailExists) {
      throw new ApiError(HTTP_STATUS.CONFLICT, "Email already in use");
    }
  }

  const updateData: Partial<typeof Users.$inferInsert> = {};

  if (email) updateData.email = email;
  if (password) updateData.password = password;

  const [updatedAdmin] = await db
    .update(Users)
    .set(updateData)
    .where(eq(Users.id, id))
    .returning();

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Admin updated successfully", {
      id: updatedAdmin.id,
      email: updatedAdmin.email,
      role: updatedAdmin.role,
    }),
  );
});

export const deleteAdmin = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const existingAdmin = await db.query.Users.findFirst({
    where: eq(Users.id, id),
  });

  if (!existingAdmin) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Admin not found");
  }

  await db.delete(Users).where(eq(Users.id, id));

  return res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, "Admin deleted successfully", null));
});

// ==================== Creator ====================

export const createCreator = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const existingCreator = await db.query.Users.findFirst({
      where: eq(Users.email, email),
    });

    if (existingCreator) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        "Creator with this email already exists",
      );
    }

    const [creator] = await db
      .insert(Users)
      .values({
        email,
        password,
        role: "CREATOR",
      })
      .returning();

    return res.status(HTTP_STATUS.CREATED).json(
      new ApiResponse(HTTP_STATUS.CREATED, "Creator created successfully", {
        id: creator.id,
        email: creator.email,
        role: creator.role,
      }),
    );
  },
);

export const loginCreator = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const creator = await db.query.Users.findFirst({
      where: and(eq(Users.email, email), eq(Users.role, "CREATOR")),
    });

    if (!creator || creator.password !== password) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid email or password");
    }

    const tokens = await generateTokenPair({
      id: creator.id,
      role: creator.role || "CREATOR",
    });

    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, "Creator logged in successfully", {
        id: creator.id,
        email: creator.email,
        role: creator.role,
        ...tokens,
      }),
    );
  },
);

export const getCreatorById = asyncHandler(
  async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const creator = await db.query.Users.findFirst({
      where: eq(Users.id, id),
    });

    if (!creator) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Creator not found");
    }

    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, "Creator fetched successfully", {
        id: creator.id,
        email: creator.email,
        role: creator.role,
      }),
    );
  },
);

export const getAllCreators = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = (req.query.search as string) || "";

    const offset = (page - 1) * limit;

    const searchCondition = search
      ? or(ilike(Users.email, `%${search}%`))
      : undefined;

    const whereCondition = searchCondition
      ? and(eq(Users.role, "CREATOR"), searchCondition)
      : eq(Users.role, "CREATOR");

    const creators = await db.query.Users.findMany({
      where: whereCondition,
      limit,
      offset,
    });

    const totalCreators = await db.query.Users.findMany({
      where: whereCondition,
    });

    if (!creators || creators.length === 0) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "No creators found");
    }

    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, "Creators fetched successfully", {
        data: creators.map((creator) => ({
          id: creator.id,
          email: creator.email,
          role: creator.role,
        })),
        pagination: {
          total: totalCreators.length,
          page,
          limit,
          totalPages: Math.ceil(totalCreators.length / limit),
        },
      }),
    );
  },
);

export const updateCreator = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };

    const { email, password } = req.body;

    const existingCreator = await db.query.Users.findFirst({
      where: eq(Users.id, id),
    });

    if (!existingCreator) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Creator not found");
    }

    if (existingCreator.role !== "CREATOR") {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, "User is not a creator");
    }

    if (email && email !== existingCreator.email) {
      const emailExists = await db.query.Users.findFirst({
        where: eq(Users.email, email),
      });

      if (emailExists) {
        throw new ApiError(HTTP_STATUS.CONFLICT, "Email already in use");
      }
    }

    const updateData: Partial<typeof Users.$inferInsert> = {};

    if (email) updateData.email = email;
    if (password) updateData.password = password;

    const [updatedCreator] = await db
      .update(Users)
      .set(updateData)
      .where(eq(Users.id, id))
      .returning();

    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, "Creator updated successfully", {
        id: updatedCreator.id,
        email: updatedCreator.email,
        role: updatedCreator.role,
      }),
    );
  },
);

export const deleteCreator = asyncHandler(
  async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const existingCreator = await db.query.Users.findFirst({
      where: eq(Users.id, id),
    });

    if (!existingCreator) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Creator not found");
    }

    if (existingCreator.role !== "CREATOR") {
      throw new ApiError(HTTP_STATUS.FORBIDDEN, "User is not a creator");
    }

    await db.delete(Users).where(eq(Users.id, id));

    return res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(HTTP_STATUS.OK, "Creator deleted successfully", null),
      );
  },
);

// ==================== GENRE MANAGEMENT ====================

export const createGenre = asyncHandler(async (req: Request, res: Response) => {
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

  const [genre] = await db
    .insert(genres)
    .values({
      name,
      image: req.file.location,
      isActive: true,
      updatedAt: new Date(),
    })
    .returning();

  return res
    .status(HTTP_STATUS.CREATED)
    .json(
      new ApiResponse(HTTP_STATUS.CREATED, "Genre created successfully", genre),
    );
});

export const updateGenre = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { name, isActive } = req.body;

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

  const updateData: any = {
    updatedAt: new Date(),
  };

  if (name) updateData.name = name;
  if (imageUrl) updateData.image = imageUrl;
  if (typeof isActive === "boolean") updateData.isActive = isActive;

  const [updatedGenre] = await db
    .update(genres)
    .set(updateData)
    .where(eq(genres.id, id))
    .returning();

  return res.json(
    new ApiResponse(HTTP_STATUS.OK, "Genre updated successfully", updatedGenre),
  );
});

export const deleteGenre = asyncHandler(async (req: Request, res: Response) => {
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

  return res.json(
    new ApiResponse(HTTP_STATUS.OK, "Genre deleted successfully", null),
  );
});

export const getAllGenres = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = (req.query.search as string) || "";
    const isActive =
      req.query.isActive === "true"
        ? true
        : req.query.isActive === "false"
          ? false
          : undefined;

    let whereClause: any = search
      ? ilike(genres.name, `%${search}%`)
      : undefined;

    if (isActive !== undefined) {
      if (whereClause) {
        whereClause = and(whereClause, eq(genres.isActive, isActive));
      } else {
        whereClause = eq(genres.isActive, isActive);
      }
    }

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(genres)
      .where(whereClause);

    const genreRows = await db
      .select()
      .from(genres)
      .where(whereClause)
      .orderBy(desc(genres.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, "Genres fetched successfully", {
        genres: genreRows,
        pagination: {
          total: parseCount(count),
          page,
          limit,
          totalPages: Math.ceil(parseCount(count) / limit),
        },
      }),
    );
  },
);

export const getGenreById = asyncHandler(
  async (req: Request, res: Response) => {
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

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(HTTP_STATUS.OK, "Genre fetched successfully", genre),
      );
  },
);

// ==================== LANGUAGE MANAGEMENT ====================

export const createLanguage = asyncHandler(
  async (req: Request, res: Response) => {
    const { name } = req.body;

    if (!req.file || !name) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "name and image are required",
      );
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
        isActive: true,
        updatedAt: new Date(),
      })
      .returning();

    return res
      .status(HTTP_STATUS.CREATED)
      .json(
        new ApiResponse(
          HTTP_STATUS.CREATED,
          "Language created successfully",
          language,
        ),
      );
  },
);

export const updateLanguage = asyncHandler(
  async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { name, isActive } = req.body;

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

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name) updateData.name = name;
    if (imageUrl) updateData.image = imageUrl;
    if (typeof isActive === "boolean") updateData.isActive = isActive;

    const [updatedLanguage] = await db
      .update(languages)
      .set(updateData)
      .where(eq(languages.id, id))
      .returning();

    return res.json(
      new ApiResponse(
        HTTP_STATUS.OK,
        "Language updated successfully",
        updatedLanguage,
      ),
    );
  },
);

export const deleteLanguage = asyncHandler(
  async (req: Request, res: Response) => {
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

    return res.json(
      new ApiResponse(HTTP_STATUS.OK, "Language deleted successfully", null),
    );
  },
);

export const getAllLanguages = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = (req.query.search as string) || "";
    const isActive =
      req.query.isActive === "true"
        ? true
        : req.query.isActive === "false"
          ? false
          : undefined;

    let whereClause: any = search
      ? ilike(languages.name, `%${search}%`)
      : undefined;

    if (isActive !== undefined) {
      if (whereClause) {
        whereClause = and(whereClause, eq(languages.isActive, isActive));
      } else {
        whereClause = eq(languages.isActive, isActive);
      }
    }

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(languages)
      .where(whereClause);

    const languageRows = await db
      .select()
      .from(languages)
      .where(whereClause)
      .orderBy(desc(languages.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, "Languages fetched successfully", {
        languages: languageRows,
        pagination: {
          total: parseCount(count),
          page,
          limit,
          totalPages: Math.ceil(parseCount(count) / limit),
        },
      }),
    );
  },
);

export const getLanguageById = asyncHandler(
  async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!id) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "id is required");
    }

    const language = await db.query.languages.findFirst({
      where: eq(languages.id, id),
    });

    if (!language) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Language not found");
    }

    res
      .status(HTTP_STATUS.OK)
      .json(
        new ApiResponse(
          HTTP_STATUS.OK,
          "Language fetched successfully",
          language,
        ),
      );
  },
);

// ==================== Users MANAGEMENT ====================

export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const search = (req.query.search as string) || "";

  const isActive =
    req.query.isActive === "true"
      ? true
      : req.query.isActive === "false"
        ? false
        : undefined;

  let whereClause: any = eq(Users.isDeleted, false);

  if (search) {
    const searchCondition = or(
      ilike(Users.email, `%${search}%`),
      ilike(Users.phone, `%${search}%`),
    );
    whereClause = and(whereClause, searchCondition);
  }

  if (isActive !== undefined) {
    whereClause = and(whereClause, eq(Users.isActive, isActive));
  }

  whereClause = and(whereClause, eq(Users.role, "USER" as any));

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(Users)
    .where(whereClause);

  const users = await db
    .select()
    .from(Users)
    .where(whereClause)
    .orderBy(desc(Users.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Users fetched successfully", {
      users,
      pagination: {
        total: parseCount(count),
        page,
        limit,
        totalPages: Math.ceil(parseCount(count) / limit),
      },
    }),
  );
});

export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  const user = await db.query.Users.findFirst({
    where: eq(Users.id, id),
  });

  if (!user || user.isDeleted) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "User not found");
  }

  const userProfiles = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, id));

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "User fetched successfully", {
      user,
      profiles: userProfiles,
    }),
  );
});





