
import { relations, sql } from "drizzle-orm";
import {
  decimal,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";

export const movieStatusEnum = pgEnum("MovieStatus", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export const videoTypeEnum = pgEnum("VideoType", ["MOVIE", "TRAILER"]);

export const movies = pgTable("Movie", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  shortDescription: text("shortDescription"),
  slug: text("slug").notNull().unique(),
  genres: text("genres").array().notNull(),
  language: text("language").notNull(),
  releaseYear: integer("releaseYear").notNull(),
  ageRating: text("ageRating").notNull().default("U/A"),
  thumbnailUrl: text("thumbnailUrl"),
  videoUrl: text("videoUrl"),
  trailerUrl: text("trailerUrl"),
  duration: integer("duration").notNull(),
  rating: decimal("rating", { precision: 3, scale: 1 }),
  totalViews: integer("totalViews").notNull().default(0),
  likes: integer("likes").notNull().default(0),
  status: movieStatusEnum("status").notNull().default("PENDING"),
  createdAt: timestamp("createdAt", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: false }).defaultNow().notNull(),
});

export const casts = pgTable("Cast", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
  name: text("name").notNull(),
  movieId: uuid("movieId")
    .notNull()
    .references(() => movies.id, { onDelete: "cascade" }),
});

export const videos = pgTable("Video", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
  movieId: uuid("movieId")
    .notNull()
    .references(() => movies.id, { onDelete: "cascade" }),
  type: videoTypeEnum("type").notNull(),
  masterUrl: text("masterUrl"),
  format: text("format").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: false }).defaultNow().notNull(),
});

export const videoQualities = pgTable("VideoQuality", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
  videoId: uuid("videoId")
    .notNull()
    .references(() => videos.id, { onDelete: "cascade" }),
  quality: text("quality").notNull(),
  url: text("url").notNull(),
  size: integer("size"),
  bitrate: integer("bitrate"),
  createdAt: timestamp("createdAt", { withTimezone: false }).defaultNow().notNull(),
});

export const moviesRelations = relations(movies, ({ many }) => ({
  cast: many(casts),
  videos: many(videos),
}));

export const castsRelations = relations(casts, ({ one }) => ({
  movie: one(movies, {
    fields: [casts.movieId],
    references: [movies.id],
  }),
}));

export const videosRelations = relations(videos, ({ one, many }) => ({
  movie: one(movies, {
    fields: [videos.movieId],
    references: [movies.id],
  }),
  qualities: many(videoQualities),
}));

export const videoQualitiesRelations = relations(videoQualities, ({ one }) => ({
  video: one(videos, {
    fields: [videoQualities.videoId],
    references: [videos.id],
  }),
}));

export const authUsers = pgTable("AuthUser", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
  phone: text("phone").notNull().unique(),
  email: text("email").unique(),
  fullName: text("fullName"),
  dob: text("dob"),
  role: text("role").notNull().default("user"),
  otp: text("otp").notNull().default(''),
  expiresAt: timestamp("expiresAt").notNull(),
  verified: boolean("verified").default(false),
  isVerified: boolean("isVerified").default(false),
  isActive: boolean("isActive").default(true),
  isDeleted: boolean("isDeleted").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
 
export const profiles = pgTable("Profile", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
  userId: uuid("userId").notNull().references(() => authUsers.id),
  profileName: text("profileName").notNull(),
  profileImg: text("profileImg"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
 
export const profileLanguages = pgTable("ProfileLanguage", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
  profileId: uuid("profileId").notNull().references(() => profiles.id),
  languageId: uuid("languageId").notNull(),
});
 
export const profileGenres = pgTable("ProfileGenre", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
  profileId: uuid("profileId").notNull().references(() => profiles.id),
  genreId: uuid("genreId").notNull(),
});

export const admins = pgTable("Admin", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("admin"),
  createdAt: timestamp("createdAt", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: false }).defaultNow().notNull(),
});

export const creators = pgTable("Creator", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").default("creator"),
  emailVerified: boolean("emailVerified").notNull().default(false),
  emailVerificationToken: text("emailVerificationToken"),
  emailVerificationExpires: timestamp("emailVerificationExpires", {
    withTimezone: false,
  }),
  createdAt: timestamp("createdAt", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: false }).defaultNow().notNull(),
});

export const genres = pgTable("Genre", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
  name: text("name").notNull().unique(),
  image: text("image").notNull(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: false }).defaultNow().notNull(),
});

export const languages = pgTable("Language", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
  name: text("name").notNull().unique(),
  image: text("image").notNull(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: false }).defaultNow().notNull(),
});







// ================= RELATIONS =================
 
// AuthUser -> Profiles
export const authUsersRelations = relations(authUsers, ({ many }) => ({
  profiles: many(profiles),
}));
 
// Profile -> ProfileLanguages + ProfileGenres
export const profilesRelations = relations(profiles, ({ many }) => ({
  profileLanguages: many(profileLanguages),
  profileGenres: many(profileGenres),
}));
 
// ProfileLanguage -> Profile
export const profileLanguagesRelations = relations(profileLanguages, ({ one }) => ({
  profile: one(profiles, {
    fields: [profileLanguages.profileId],
    references: [profiles.id],
  }),
}));
 
// ProfileGenre -> Profile
export const profileGenresRelations = relations(profileGenres, ({ one }) => ({
  profile: one(profiles, {
    fields: [profileGenres.profileId],
    references: [profiles.id],
  }),
}));
