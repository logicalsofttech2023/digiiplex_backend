import { pgTable, unique, uuid, text, integer, numeric, timestamp, foreignKey, boolean, pgEnum } from "drizzle-orm/pg-core";
export const movieStatus = pgEnum("MovieStatus", ['PENDING', 'APPROVED', 'REJECTED']);
export const videoType = pgEnum("VideoType", ['MOVIE', 'TRAILER']);
export const movie = pgTable("Movie", {
    id: uuid().defaultRandom().primaryKey().notNull(),
    title: text().notNull(),
    description: text().notNull(),
    shortDescription: text(),
    slug: text().notNull(),
    genres: text().array().notNull(),
    language: text().notNull(),
    releaseYear: integer().notNull(),
    ageRating: text().default('U/A').notNull(),
    thumbnailUrl: text(),
    videoUrl: text(),
    trailerUrl: text(),
    duration: integer().notNull(),
    rating: numeric({ precision: 3, scale: 1 }),
    totalViews: integer().default(0).notNull(),
    likes: integer().default(0).notNull(),
    status: movieStatus().default('PENDING').notNull(),
    createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    unique("Movie_slug_unique").on(table.slug),
]);
export const cast = pgTable("Cast", {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    movieId: uuid().notNull(),
}, (table) => [
    foreignKey({
        columns: [table.movieId],
        foreignColumns: [movie.id],
        name: "Cast_movieId_Movie_id_fk"
    }).onDelete("cascade"),
]);
export const video = pgTable("Video", {
    id: uuid().defaultRandom().primaryKey().notNull(),
    movieId: uuid().notNull(),
    type: videoType().notNull(),
    masterUrl: text(),
    format: text().notNull(),
    createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    foreignKey({
        columns: [table.movieId],
        foreignColumns: [movie.id],
        name: "Video_movieId_Movie_id_fk"
    }).onDelete("cascade"),
]);
export const videoQuality = pgTable("VideoQuality", {
    id: uuid().defaultRandom().primaryKey().notNull(),
    videoId: uuid().notNull(),
    quality: text().notNull(),
    url: text().notNull(),
    size: integer(),
    bitrate: integer(),
    createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    foreignKey({
        columns: [table.videoId],
        foreignColumns: [video.id],
        name: "VideoQuality_videoId_Video_id_fk"
    }).onDelete("cascade"),
]);
export const language = pgTable("Language", {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    image: text().notNull(),
    isActive: boolean().default(true).notNull(),
    createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    unique("Language_name_unique").on(table.name),
]);
export const admin = pgTable("Admin", {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    email: text().notNull(),
    password: text().notNull(),
    role: text().default('admin').notNull(),
    createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    unique("Admin_email_unique").on(table.email),
]);
export const creator = pgTable("Creator", {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    email: text().notNull(),
    password: text().notNull(),
    role: text().default('creator'),
    emailVerified: boolean().default(false).notNull(),
    emailVerificationToken: text(),
    emailVerificationExpires: timestamp({ mode: 'string' }),
    createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    unique("Creator_email_unique").on(table.email),
]);
export const genre = pgTable("Genre", {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    image: text().notNull(),
    isActive: boolean().default(true).notNull(),
    createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    unique("Genre_name_unique").on(table.name),
]);
export const profile = pgTable("Profile", {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid().notNull(),
    profileName: text().notNull(),
    profileImg: text(),
    createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    foreignKey({
        columns: [table.userId],
        foreignColumns: [authUser.id],
        name: "Profile_userId_AuthUser_id_fk"
    }),
]);
export const profileGenre = pgTable("ProfileGenre", {
    id: uuid().defaultRandom().primaryKey().notNull(),
    profileId: uuid().notNull(),
    genreId: uuid().notNull(),
}, (table) => [
    foreignKey({
        columns: [table.profileId],
        foreignColumns: [profile.id],
        name: "ProfileGenre_profileId_Profile_id_fk"
    }),
]);
export const profileLanguage = pgTable("ProfileLanguage", {
    id: uuid().defaultRandom().primaryKey().notNull(),
    profileId: uuid().notNull(),
    languageId: uuid().notNull(),
}, (table) => [
    foreignKey({
        columns: [table.profileId],
        foreignColumns: [profile.id],
        name: "ProfileLanguage_profileId_Profile_id_fk"
    }),
]);
export const authUser = pgTable("AuthUser", {
    id: uuid().defaultRandom().primaryKey().notNull(),
    phone: text().notNull(),
    email: text(),
    fullName: text(),
    dob: text(),
    role: text().default('user').notNull(),
    otp: text().default('').notNull(),
    expiresAt: timestamp({ mode: 'string' }).notNull(),
    verified: boolean().default(false),
    isVerified: boolean().default(false),
    isActive: boolean().default(true),
    isDeleted: boolean().default(false),
    createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    unique("AuthUser_phone_unique").on(table.phone),
    unique("AuthUser_email_unique").on(table.email),
]);
export const subscription = pgTable("Subscription", {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid().notNull(),
    plan: text().notNull(),
    createdAt: timestamp({ mode: 'string' }).defaultNow().notNull(),
});
