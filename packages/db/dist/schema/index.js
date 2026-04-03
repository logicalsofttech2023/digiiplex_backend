"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscription = exports.authUser = exports.profileLanguage = exports.profileGenre = exports.profile = exports.genre = exports.creator = exports.admin = exports.language = exports.videoQuality = exports.video = exports.cast = exports.movie = exports.videoType = exports.movieStatus = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.movieStatus = (0, pg_core_1.pgEnum)("MovieStatus", ['PENDING', 'APPROVED', 'REJECTED']);
exports.videoType = (0, pg_core_1.pgEnum)("VideoType", ['MOVIE', 'TRAILER']);
exports.movie = (0, pg_core_1.pgTable)("Movie", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    title: (0, pg_core_1.text)().notNull(),
    description: (0, pg_core_1.text)().notNull(),
    shortDescription: (0, pg_core_1.text)(),
    slug: (0, pg_core_1.text)().notNull(),
    genres: (0, pg_core_1.text)().array().notNull(),
    language: (0, pg_core_1.text)().notNull(),
    releaseYear: (0, pg_core_1.integer)().notNull(),
    ageRating: (0, pg_core_1.text)().default('U/A').notNull(),
    thumbnailUrl: (0, pg_core_1.text)(),
    videoUrl: (0, pg_core_1.text)(),
    trailerUrl: (0, pg_core_1.text)(),
    duration: (0, pg_core_1.integer)().notNull(),
    rating: (0, pg_core_1.numeric)({ precision: 3, scale: 1 }),
    totalViews: (0, pg_core_1.integer)().default(0).notNull(),
    likes: (0, pg_core_1.integer)().default(0).notNull(),
    status: (0, exports.movieStatus)().default('PENDING').notNull(),
    createdAt: (0, pg_core_1.timestamp)({ mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.unique)("Movie_slug_unique").on(table.slug),
]);
exports.cast = (0, pg_core_1.pgTable)("Cast", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    name: (0, pg_core_1.text)().notNull(),
    movieId: (0, pg_core_1.uuid)().notNull(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.movieId],
        foreignColumns: [exports.movie.id],
        name: "Cast_movieId_Movie_id_fk"
    }).onDelete("cascade"),
]);
exports.video = (0, pg_core_1.pgTable)("Video", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    movieId: (0, pg_core_1.uuid)().notNull(),
    type: (0, exports.videoType)().notNull(),
    masterUrl: (0, pg_core_1.text)(),
    format: (0, pg_core_1.text)().notNull(),
    createdAt: (0, pg_core_1.timestamp)({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.movieId],
        foreignColumns: [exports.movie.id],
        name: "Video_movieId_Movie_id_fk"
    }).onDelete("cascade"),
]);
exports.videoQuality = (0, pg_core_1.pgTable)("VideoQuality", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    videoId: (0, pg_core_1.uuid)().notNull(),
    quality: (0, pg_core_1.text)().notNull(),
    url: (0, pg_core_1.text)().notNull(),
    size: (0, pg_core_1.integer)(),
    bitrate: (0, pg_core_1.integer)(),
    createdAt: (0, pg_core_1.timestamp)({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.videoId],
        foreignColumns: [exports.video.id],
        name: "VideoQuality_videoId_Video_id_fk"
    }).onDelete("cascade"),
]);
exports.language = (0, pg_core_1.pgTable)("Language", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    name: (0, pg_core_1.text)().notNull(),
    image: (0, pg_core_1.text)().notNull(),
    isActive: (0, pg_core_1.boolean)().default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)({ mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.unique)("Language_name_unique").on(table.name),
]);
exports.admin = (0, pg_core_1.pgTable)("Admin", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    name: (0, pg_core_1.text)().notNull(),
    email: (0, pg_core_1.text)().notNull(),
    password: (0, pg_core_1.text)().notNull(),
    role: (0, pg_core_1.text)().default('admin').notNull(),
    createdAt: (0, pg_core_1.timestamp)({ mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.unique)("Admin_email_unique").on(table.email),
]);
exports.creator = (0, pg_core_1.pgTable)("Creator", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    name: (0, pg_core_1.text)().notNull(),
    email: (0, pg_core_1.text)().notNull(),
    password: (0, pg_core_1.text)().notNull(),
    role: (0, pg_core_1.text)().default('creator'),
    emailVerified: (0, pg_core_1.boolean)().default(false).notNull(),
    emailVerificationToken: (0, pg_core_1.text)(),
    emailVerificationExpires: (0, pg_core_1.timestamp)({ mode: 'string' }),
    createdAt: (0, pg_core_1.timestamp)({ mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.unique)("Creator_email_unique").on(table.email),
]);
exports.genre = (0, pg_core_1.pgTable)("Genre", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    name: (0, pg_core_1.text)().notNull(),
    image: (0, pg_core_1.text)().notNull(),
    isActive: (0, pg_core_1.boolean)().default(true).notNull(),
    createdAt: (0, pg_core_1.timestamp)({ mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.unique)("Genre_name_unique").on(table.name),
]);
exports.profile = (0, pg_core_1.pgTable)("Profile", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    userId: (0, pg_core_1.uuid)().notNull(),
    profileName: (0, pg_core_1.text)().notNull(),
    profileImg: (0, pg_core_1.text)(),
    createdAt: (0, pg_core_1.timestamp)({ mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.userId],
        foreignColumns: [exports.authUser.id],
        name: "Profile_userId_AuthUser_id_fk"
    }),
]);
exports.profileGenre = (0, pg_core_1.pgTable)("ProfileGenre", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    profileId: (0, pg_core_1.uuid)().notNull(),
    genreId: (0, pg_core_1.uuid)().notNull(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.profileId],
        foreignColumns: [exports.profile.id],
        name: "ProfileGenre_profileId_Profile_id_fk"
    }),
]);
exports.profileLanguage = (0, pg_core_1.pgTable)("ProfileLanguage", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    profileId: (0, pg_core_1.uuid)().notNull(),
    languageId: (0, pg_core_1.uuid)().notNull(),
}, (table) => [
    (0, pg_core_1.foreignKey)({
        columns: [table.profileId],
        foreignColumns: [exports.profile.id],
        name: "ProfileLanguage_profileId_Profile_id_fk"
    }),
]);
exports.authUser = (0, pg_core_1.pgTable)("AuthUser", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    phone: (0, pg_core_1.text)().notNull(),
    email: (0, pg_core_1.text)(),
    fullName: (0, pg_core_1.text)(),
    dob: (0, pg_core_1.text)(),
    role: (0, pg_core_1.text)().default('user').notNull(),
    otp: (0, pg_core_1.text)().default('').notNull(),
    expiresAt: (0, pg_core_1.timestamp)({ mode: 'string' }).notNull(),
    verified: (0, pg_core_1.boolean)().default(false),
    isVerified: (0, pg_core_1.boolean)().default(false),
    isActive: (0, pg_core_1.boolean)().default(true),
    isDeleted: (0, pg_core_1.boolean)().default(false),
    createdAt: (0, pg_core_1.timestamp)({ mode: 'string' }).defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)({ mode: 'string' }).defaultNow().notNull(),
}, (table) => [
    (0, pg_core_1.unique)("AuthUser_phone_unique").on(table.phone),
    (0, pg_core_1.unique)("AuthUser_email_unique").on(table.email),
]);
exports.subscription = (0, pg_core_1.pgTable)("Subscription", {
    id: (0, pg_core_1.uuid)().defaultRandom().primaryKey().notNull(),
    userId: (0, pg_core_1.uuid)().notNull(),
    plan: (0, pg_core_1.text)().notNull(),
    createdAt: (0, pg_core_1.timestamp)({ mode: 'string' }).defaultNow().notNull(),
});
