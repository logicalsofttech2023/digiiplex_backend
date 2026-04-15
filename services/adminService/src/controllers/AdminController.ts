import { and, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HTTP_STATUS } from "../constants/constant.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import { deleteFromS3 } from "../utils/s3Delete.js";
import { db, Users, genres, languages } from "@digiiplex6112/db";
import { sendEmail } from "../config/sendEmail.js";
const parseCount = (value: unknown) => Number(value ?? 0);


export const createSuperAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Email and password are required");
  }

  const existingAdmin = await db.query.Users.findFirst({
    where: eq(Users.email, email),
  });

  if (existingAdmin) {
    throw new ApiError(HTTP_STATUS.CONFLICT, "Admin with this email already exists");
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

});

export const loginSuperAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Email and password are required");
  }

  const admin = await db.query.Users.findFirst({
    where: and(
      eq(Users.email, email),
      eq(Users.role, "SUPER_ADMIN"),
    ),
  });

  if (!admin || admin.password !== password) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid email or password");
  }

  return res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Super admin logged in successfully", {
      id: admin.id,
      email: admin.email,
      role: admin.role,
    }),
  );
});



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
    .json(new ApiResponse(HTTP_STATUS.CREATED, "Genre created successfully", genre));
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
  if (typeof isActive === 'boolean') updateData.isActive = isActive;

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

export const getAllGenres = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const search = (req.query.search as string) || "";
  const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
  
  let whereClause: any = search ? ilike(genres.name, `%${search}%`) : undefined;
  
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
});

export const getGenreById = asyncHandler(async (req: Request, res: Response) => {
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

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Genre fetched successfully", genre),
  );
});

// ==================== LANGUAGE MANAGEMENT ====================

export const createLanguage = asyncHandler(async (req: Request, res: Response) => {
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
      isActive: true,
      updatedAt: new Date(),
    })
    .returning();

  return res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(
      HTTP_STATUS.CREATED,
      "Language created successfully",
      language,
    ),
  );
});

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
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

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
    const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
    
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

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, "Language fetched successfully", language),
    );
  },
);