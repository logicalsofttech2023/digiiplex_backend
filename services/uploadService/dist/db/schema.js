import { relations } from "drizzle-orm";
import { decimal, integer, pgEnum, pgTable, text, timestamp, uuid, } from "drizzle-orm/pg-core";
export const movieStatusEnum = pgEnum("MovieStatus", [
    "PENDING",
    "APPROVED",
    "REJECTED",
]);
export const videoTypeEnum = pgEnum("VideoType", ["MOVIE", "TRAILER"]);
export const movies = pgTable("Movie", {
    id: uuid("id").defaultRandom().primaryKey(),
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
    rating: decimal("rating", { precision: 2, scale: 1 }),
    totalViews: integer("totalViews").notNull().default(0),
    likes: integer("likes").notNull().default(0),
    status: movieStatusEnum("status").notNull().default("PENDING"),
    createdAt: timestamp("createdAt", { withTimezone: false }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: false }).defaultNow().notNull(),
});
export const casts = pgTable("Cast", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    movieId: uuid("movieId")
        .notNull()
        .references(() => movies.id, { onDelete: "cascade" }),
});
export const videos = pgTable("Video", {
    id: uuid("id").defaultRandom().primaryKey(),
    movieId: uuid("movieId")
        .notNull()
        .references(() => movies.id, { onDelete: "cascade" }),
    type: videoTypeEnum("type").notNull(),
    masterUrl: text("masterUrl"),
    format: text("format").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: false }).defaultNow().notNull(),
});
export const videoQualities = pgTable("VideoQuality", {
    id: uuid("id").defaultRandom().primaryKey(),
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
//# sourceMappingURL=schema.js.map