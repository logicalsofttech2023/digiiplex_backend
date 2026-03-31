import Admin from "../models/AdminModel.js";
import Creator from "../models/CreatorModel.js";
import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HTTP_STATUS, MESSAGES } from "../constants/constant.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import bcrypt from "bcrypt";
import { generateToken } from "../utils/jwt.js";
import emailQueue from "../queue/queue.js";
import crypto from "crypto";
import Genre from "../models/genreModel.js";
import Language from "../models/languageModel.js";
import {
  decryptPassword,
  encryptPassword,
  verifyPassword,
} from "../utils/encryption.js";
import { deleteFromS3 } from "../utils/s3Delete.js";
import { prisma } from "../config/db.js"; 
import { FRONTEND_URL } from "../constants/constant.js";
import { sendEmail } from "../config/sendEmail.js";


export const createAdmin = asyncHandler(
  async (req: Request, res: Response) => {
    const { name, email, password } = req.body;

    if (!email || !password || !name) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "name, email and password are required"
      );
    }

    const existingAdmin = await prisma.admin.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        "Admin with this email already exists"
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await prisma.admin.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "admin", 
      },
    });

    res.status(HTTP_STATUS.CREATED).json(
      new ApiResponse(HTTP_STATUS.CREATED, MESSAGES.ADMIN.CREATED, {
        name: admin.name,
        email: admin.email,
        role: admin.role,
      })
    );
  }
);

export const loginAdmin = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, password } = req.body;

    // ✅ Check required fields
    if (!email || !password) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "email and password are required"
      );
    }

    // ✅ Find admin by email
    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        MESSAGES.AUTH.INVALID_CREDENTIALS
      );
    }

    // ✅ Compare password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      throw new ApiError(
        HTTP_STATUS.UNAUTHORIZED,
        MESSAGES.AUTH.INVALID_CREDENTIALS
      );
    }

    // ✅ Generate JWT
    const token = await generateToken({ id: admin.id, role: admin.role });

    // ✅ Send response
    res
      .status(HTTP_STATUS.OK)
      .json(new ApiResponse(HTTP_STATUS.OK, MESSAGES.ADMIN.LOGIN_SUCCESS, { token }));
  }
);

export const createCreator = asyncHandler(
  async (req: Request, res: Response) => {
    const { name, email, password } = req.body;

    // ✅ Required fields check
    if (!email || !password || !name) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "name, email and password are required"
      );
    }

    // ✅ Check if creator already exists
    const existing = await prisma.creator.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ApiError(
        HTTP_STATUS.CONFLICT,
        MESSAGES.CREATOR.ALREADY_EXISTS
      );
    }

    // ✅ Create creator
    const creator = await prisma.creator.create({
      data: {
        name,
        email,
        password,
        role: "creator", // default role
        emailVerified: false,
      },
    });

    // ✅ Response
    res.status(HTTP_STATUS.CREATED).json(
      new ApiResponse(HTTP_STATUS.CREATED, MESSAGES.CREATOR.CREATED, {
        name: creator.name,
        email: creator.email,
        role: creator.role,
      })
    );
  }
);

// update
export const updateCreator = asyncHandler(
  async (req: Request, res: Response) => {
    const rawId = req.params.id;

    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Creator id is required");
    }

    const { name, email } = req.body;

    const existingCreator = await prisma.creator.findUnique({
      where: { id },
    });

    if (!existingCreator) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Creator not found");
    }

    const updatedCreator = await prisma.creator.update({
      where: { id },
      data: {
        name: name ?? existingCreator.name,
        email: email ?? existingCreator.email,
      },
    });

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, "Creator updated successfully", updatedCreator)
    );
  }
);
// delete
export const deleteCreator = asyncHandler(
  async (req: Request, res: Response) => {
    const rawId = req.params.id;

    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Creator id is required");
    }

    const existingCreator = await prisma.creator.findUnique({
      where: { id },
    });

    if (!existingCreator) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Creator not found");
    }

    await prisma.creator.delete({
      where: { id },
    });

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, "Creator deleted successfully", null)
    );
  }
);

export const getAllCreator = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = (req.query.search as string) || "";

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const total = await prisma.creator.count({ where });

    const creators = await prisma.creator.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    const decryptedCreators = creators.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      role: c.role,
      password: c.password ? decryptPassword(c.password) : null,
    }));

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, "Creators fetched successfully", {
        creators: decryptedCreators,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      })
    );
  }
)


// ✅ LOGIN CREATOR
// ==========================================

export const loginCreator = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Email and password are required"
      );
    }

    // 🔍 Find creator
    const creator = await prisma.creator.findUnique({
      where: { email },
    });

    if (!creator) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid credentials");
    }

    const verifyPassword = () => {
      if (creator.password === password) {
        return true;
      }
    }

    // 🔐 Check password
    const isPasswordValid = verifyPassword();

    if (!isPasswordValid) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid credentials");
    }

    // ==========================================
    // ❗ EMAIL NOT VERIFIED FLOW
    // ==========================================
    if (!creator.emailVerified) {
      // 🎯 Generate token
      const token = crypto.randomBytes(32).toString("hex");

      const hashedToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

      // 💾 Save token in DB
      await prisma.creator.update({
        where: { id: creator.id },
        data: {
          emailVerificationToken: hashedToken,
          emailVerificationExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 min
        },
      });

      // 🔗 Verification URL
      const verifyUrl = `${FRONTEND_URL}/verify-email/${token}`;

      // 📩 Send email (DIRECT)
      await sendEmail(
        creator.email,
        "Verify your email",
        `<h2>Email Verification</h2>
         <p>Click below to verify your email:</p>
         <a href="${verifyUrl}">Verify Email</a>`
      );

      return res.status(HTTP_STATUS.OK).json(
        new ApiResponse(
          HTTP_STATUS.OK,
          "Verification email sent. Please verify first."
        )
      );
    }

    // ==========================================
    // ✅ NORMAL LOGIN
    // ==========================================
    const jwtToken = await generateToken({
      id: creator.id,
      role: creator.role,
    });

    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, MESSAGES.CREATOR.LOGIN_SUCCESS, {
        token: jwtToken,
      })
    );
  }
);

export const verifyEmail = asyncHandler(
  async (req: Request, res: Response) => {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Token is required");
    }

    // 🔐 Hash token
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // 🔍 Find creator
    const creator = await prisma.creator.findFirst({
      where: {
        emailVerificationToken: hashedToken,
        emailVerificationExpires: {
          gt: new Date(), // not expired
        },
      },
    });

    if (!creator) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "Invalid or expired token"
      );
    }

    // ✅ Update verified
    const updatedCreator = await prisma.creator.update({
      where: { id: creator.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    // 🔑 Generate JWT after verify
    const jwtToken = await generateToken({
      id: updatedCreator.id,
      role: updatedCreator.role,
    });

    return res.status(HTTP_STATUS.OK).json(
      new ApiResponse(
        HTTP_STATUS.OK,
        "Email verified successfully",
        { token: jwtToken }
      )
    );
  }
);

export const createGenre = asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.body;

  if (!req.file || !name) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "name and image are required");
  }

  const imageUrl = req.file.location;

  // Prisma me check karenge agar same name ka genre exist karta hai
  const existingGenre = await prisma.genre.findUnique({
    where: { name },
  });

  if (existingGenre) {
    throw new ApiError(HTTP_STATUS.CONFLICT, "Genre name already exists");
  }

  // Genre create karenge
  await prisma.genre.create({
    data: {
      name,
      image: imageUrl,
    },
  });

  return res
    .status(HTTP_STATUS.CREATED)
    .json(new ApiResponse(HTTP_STATUS.CREATED, "Genre created successfully"));
});


export const updateGenre = asyncHandler(async (req: Request, res: Response) => {
  const rawId = req.params.id;

  const id = Array.isArray(rawId) ? rawId[0] : rawId;   // ✅ safe handling
  const { name } = req.body;

  if (!id) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "id is required");
  }

  const genre = await prisma.genre.findUnique({
    where: { id },
  });

  if (!genre) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Genre not found");
  }

  let imageUrl = genre.image;

  if (req.file) {
    const newImage = req.file.location;

    if (genre.image) {
      await deleteFromS3(genre.image);
    }

    imageUrl = newImage;
  }

  const updatedGenre = await prisma.genre.update({
    where: { id },
    data: {
      name: name ?? genre.name,
      image: imageUrl,
    },
  });

  return res.json(
    new ApiResponse(HTTP_STATUS.OK, "Genre updated successfully", updatedGenre)
  );
});
export const deleteGenre = asyncHandler(async (req: Request, res: Response) => {
  const rawId = req.params.id;

  const id = Array.isArray(rawId) ? rawId[0] : rawId;   // ✅ safe

  if (!id) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "id is required");
  }

  const genre = await prisma.genre.findUnique({
    where: { id },
  });

  if (!genre) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Genre not found");
  }

  if (genre.image) {
    await deleteFromS3(genre.image);
  }

  await prisma.genre.delete({
    where: { id },
  });

  return res.json(
    new ApiResponse(HTTP_STATUS.OK, "Genre deleted successfully", null)
  );
});

export const getAllGenres = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const search = (req.query.search as string) || "";

  // Filter construct
  const where = search
    ? {
        name: {
          contains: search,
          mode: "insensitive" as const, // Prisma me QueryMode
        },
      }
    : {};

  // Total count
  const total = await prisma.genre.count({ where });

  // Get paginated genres
  const genres = await prisma.genre.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: {
      createdAt: "desc",
    },
  });

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Genres fetched successfully", {
      data: genres,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  );
});

export const createLanguage = asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.body;

  if (!req.file || !name) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "name and image are required");
  }

  const imageUrl = req.file.location;

  // Check if language with same name exists
  const existingLanguage = await prisma.language.findUnique({
    where: { name },
  });

  if (existingLanguage) {
    throw new ApiError(HTTP_STATUS.CONFLICT, "Language name already exists");
  }

  // Create language
  const language = await prisma.language.create({
    data: {
      name,
      image: imageUrl,
    },
  });

  return res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(HTTP_STATUS.CREATED, "Language created successfully", language)
  );
});
export const updateLanguage = asyncHandler(async (req: Request, res: Response) => {
  const rawId = req.params.id;

  const id = Array.isArray(rawId) ? rawId[0] : rawId;   // ✅ safe handling
  const { name } = req.body;

  if (!id) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "id is required");
  }

  // Check if language exists
  const existingLanguage = await prisma.language.findUnique({
    where: { id },
  });

  if (!existingLanguage) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Language not found");
  }

  let imageUrl = existingLanguage.image;

  // Update image if new file is uploaded
  if (req.file) {
    const newImage = req.file.location;

    if (existingLanguage.image) {
      await deleteFromS3(existingLanguage.image);
    }

    imageUrl = newImage;
  }

  // Update language
  const updatedLanguage = await prisma.language.update({
    where: { id },
    data: {
      name: name ?? existingLanguage.name,
      image: imageUrl,
    },
  });

  return res.json(
    new ApiResponse(
      HTTP_STATUS.OK,
      "Language updated successfully",
      updatedLanguage
    )
  );
});
export const deleteLanguage = asyncHandler(async (req: Request, res: Response) => {
  const rawId = req.params.id;

  const id = Array.isArray(rawId) ? rawId[0] : rawId;   // ✅ safe

  if (!id) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "id is required");
  }

  // Check if language exists
  const existingLanguage = await prisma.language.findUnique({
    where: { id },
  });

  if (!existingLanguage) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Language not found");
  }

  // Delete image from S3 if exists
  if (existingLanguage.image) {
    await deleteFromS3(existingLanguage.image);
  }

  // Delete language
  await prisma.language.delete({
    where: { id },
  });

  return res.json(
    new ApiResponse(HTTP_STATUS.OK, "Language deleted successfully", null)
  );
});

export const getAllLanguages = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const search = (req.query.search as string) || "";

  const where = search
    ? {
        name: {
          contains: search,
          mode: "insensitive" as "insensitive", // <-- direct type assertion
        },
      }
    : {};

  const total = await prisma.language.count({ where });

  const languages = await prisma.language.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Languages fetched successfully", {
      languages,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  );
});
