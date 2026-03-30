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

export const createAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  if (!email || !password || !name) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "name, email and password are required",
    );
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const admin = await Admin.create({ name, email, password: hashedPassword });

  res.status(HTTP_STATUS.CREATED).json(
    new ApiResponse(HTTP_STATUS.CREATED, MESSAGES.ADMIN.CREATED, {
      name: admin.name,
      email: admin.email,
      role: admin.role,
    }),
  );
});

export const loginAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(
      HTTP_STATUS.BAD_REQUEST,
      "email and password are required",
    );
  }
  const admin = await Admin.findOne({ email });
  if (!admin) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      MESSAGES.AUTH.INVALID_CREDENTIALS,
    );
  }
  const isPasswordValid = await bcrypt.compare(password, admin.password);
  if (!isPasswordValid) {
    throw new ApiError(
      HTTP_STATUS.UNAUTHORIZED,
      MESSAGES.AUTH.INVALID_CREDENTIALS,
    );
  }

  const token = await generateToken({ id: admin._id, role: admin.role });
  res
    .status(HTTP_STATUS.OK)
    .json(new ApiResponse(HTTP_STATUS.OK, MESSAGES.ADMIN.LOGIN_SUCCESS, token));
});

export const createCreator = asyncHandler(
  async (req: Request, res: Response) => {
    const { name, email, password } = req.body;
    if (!email || !password || !name) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "name, email and password are required",
      );
    }

    const existing = await Creator.findOne({ email });
    if (existing) {
      throw new ApiError(HTTP_STATUS.CONFLICT, MESSAGES.CREATOR.ALREADY_EXISTS);
    }
    const hashedPassword = encryptPassword(password);
    const creator = await Creator.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(HTTP_STATUS.CREATED).json(
      new ApiResponse(HTTP_STATUS.CREATED, MESSAGES.CREATOR.CREATED, {
        name: creator.name,
        email: creator.email,
        role: creator.role,
      }),
    );
  },
);

export const getAllCreator = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = (req.query.search as string) || "";

    const filter: any = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const total = await Creator.countDocuments(filter);

    const creators = await Creator.find(filter)
      .select("-password")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const decryptedCreators = creators.map((c) => ({
      _id: c._id,
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
      }),
    );
  },
);

export const loginCreator = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        "email or password are required",
      );
    }

    const creator = await Creator.findOne({ email });

    if (!creator) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid credentials");
    }

    const isPasswordValid = verifyPassword(password, creator.password);

    if (!isPasswordValid) {
      throw new ApiError(HTTP_STATUS.UNAUTHORIZED, "Invalid credentials");
    }

    if (!creator.emailVerified) {
      const token = creator.generateEmailVerificationToken();
      await creator.save();

      const verifyUrl = `http://localhost:5173/verify-email/${token}`;

      await emailQueue.add("send-verification", {
        to: creator.email,
        subject: "Verify your email",
        html: `<h2>Click to verify</h2>
             <a href="${verifyUrl}">Verify Email</a>`,
      });

      return res
        .status(HTTP_STATUS.OK)
        .json(
          new ApiResponse(
            HTTP_STATUS.OK,
            "Verification email sent. Please verify first.",
          ),
        );
    }

    // ✅ Normal login
    const jwtToken = await generateToken({
      id: creator._id,
      role: creator.role,
    });

    res.status(HTTP_STATUS.OK).json(
      new ApiResponse(HTTP_STATUS.OK, MESSAGES.CREATOR.LOGIN_SUCCESS, {
        token: jwtToken,
      }),
    );
  },
);

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.query;

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const creator = await Creator.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!creator) {
    throw new ApiError(400, "Invalid or expired token");
  }

  creator.emailVerified = true;
  creator.emailVerificationToken = undefined;
  creator.emailVerificationExpires = undefined;

  await creator.save();

  const JwtToken = await generateToken({
    id: creator._id,
    role: creator.role,
  });

  // redirect or send token
  res
    .status(HTTP_STATUS.OK)
    .json(
      new ApiResponse(HTTP_STATUS.OK, "Email verified", { token: JwtToken }),
    );
});

export const createGenre = async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!req.file || !name) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "name and image is required");
  }
  const imageUrl = req.file.location;

  const existingGenre = await Genre.findOne({ name });
  if (existingGenre) {
    throw new ApiError(HTTP_STATUS.CONFLICT, "Genre name already exists");
  }

  const genre = await Genre.create({
    name,
    image: imageUrl,
  });

  return res
    .status(HTTP_STATUS.CREATED)
    .json(new ApiResponse(HTTP_STATUS.CREATED, "Genre created"));
};

export const updateGenre = async (req: Request, res: Response) => {
  const { id } = req.query;
  const { name } = req.body;

  if (!id) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "id are required");
  }

  const genre = await Genre.findById(id);
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

  genre.name = name || genre.name;
  genre.image = imageUrl;

  await genre.save();

  return res.json(
    new ApiResponse(HTTP_STATUS.OK, "Genre updated successfully", genre),
  );
};

export const deleteGenre = async (req: Request, res: Response) => {
  const { id } = req.query;
  const genre = await Genre.findById(id);
  if (!genre) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Genre not found");
  }
  if (genre.image) {
    await deleteFromS3(genre.image);
  }
  await Genre.findByIdAndDelete(id);
  return res.json(
    new ApiResponse(HTTP_STATUS.OK, "Genre deleted successfully", null),
  );
};

export const getAllGenres = async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const search = Number(req.query.search as string) || "";

  const filter: any = {};

  if (search) {
    filter.$or = [{ name: { $regex: search, $options: "i" } }];
  }

  const total = await Genre.countDocuments(filter);
  const genres = await Genre.find(filter)
    .skip((page - 1) * limit)
    .limit(limit)
    .sort({ createdAt: -1 });

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Genres fetched successfully", {
      data: genres,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }),
  );
};

export const createLanguage = async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!req.file || !name) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "name and image is required");
  }
  const imageUrl = req.file.location;

  const existingLanguage = await Language.findOne({ name });
  if (existingLanguage) {
    throw new ApiError(HTTP_STATUS.CONFLICT, "Genre name already exists");
  }

  const language = await Language.create({
    name,
    image: imageUrl,
  });

  return res
    .status(HTTP_STATUS.CREATED)
    .json(new ApiResponse(HTTP_STATUS.CREATED, "language created", language));
}

export const updateLanguage = async (req: Request, res: Response) => {
  const { id } = req.query;
  const { name } = req.body;

  if (!id) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, "id are required");
  }

  const language = await Language.findById(id);
  if (!language) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "Language not found");
  }

  let imageUrl = language.image;

  if (req.file) {
    const newImage = req.file.location;
    if (language.image) {
      await deleteFromS3(language.image);
    }
    imageUrl = newImage;
  }

  language.name = name || language.name;
  language.image = imageUrl;

  await language.save();

  return res.json(
    new ApiResponse(HTTP_STATUS.OK, "Language updated successfully", language),
  );
};

export const deleteLanguage = async (req: Request, res: Response) => {
  const { id } = req.query;
  const language = await Language.findById(id);
  if (!language) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, "language not found");
  }
  if (language.image) {
    await deleteFromS3(language.image);
  }
  await Language.findByIdAndDelete(id);
  return res.json(
    new ApiResponse(HTTP_STATUS.OK, "Language deleted successfully", null),
  );
};

export const getAllLanguages = async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const search = Number(req.query.search as string) || "";

  const filter: any = {};

  if (search) {
    filter.$or = [{ name: { $regex: search, $options: "i" } }];
  }

  const total = await Language.countDocuments(filter);
  const languages = await Language.find(filter)
    .skip((page - 1) * limit)
    .limit(limit)
    .sort({ createdAt: -1 });

  res.status(HTTP_STATUS.OK).json(
    new ApiResponse(HTTP_STATUS.OK, "Language fetched successfully", {
      languages,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }),
  );
};
