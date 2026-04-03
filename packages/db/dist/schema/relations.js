"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileLanguageRelations = exports.profileGenreRelations = exports.authUserRelations = exports.profileRelations = exports.videoQualityRelations = exports.videoRelations = exports.movieRelations = exports.castRelations = void 0;
const relations_1 = require("drizzle-orm/relations");
const index_1 = require("./index");
exports.castRelations = (0, relations_1.relations)(index_1.cast, ({ one }) => ({
    movie: one(index_1.movie, {
        fields: [index_1.cast.movieId],
        references: [index_1.movie.id]
    }),
}));
exports.movieRelations = (0, relations_1.relations)(index_1.movie, ({ many }) => ({
    casts: many(index_1.cast),
    videos: many(index_1.video),
}));
exports.videoRelations = (0, relations_1.relations)(index_1.video, ({ one, many }) => ({
    movie: one(index_1.movie, {
        fields: [index_1.video.movieId],
        references: [index_1.movie.id]
    }),
    videoQualities: many(index_1.videoQuality),
}));
exports.videoQualityRelations = (0, relations_1.relations)(index_1.videoQuality, ({ one }) => ({
    video: one(index_1.video, {
        fields: [index_1.videoQuality.videoId],
        references: [index_1.video.id]
    }),
}));
exports.profileRelations = (0, relations_1.relations)(index_1.profile, ({ one, many }) => ({
    authUser: one(index_1.authUser, {
        fields: [index_1.profile.userId],
        references: [index_1.authUser.id]
    }),
    profileGenres: many(index_1.profileGenre),
    profileLanguages: many(index_1.profileLanguage),
}));
exports.authUserRelations = (0, relations_1.relations)(index_1.authUser, ({ many }) => ({
    profiles: many(index_1.profile),
}));
exports.profileGenreRelations = (0, relations_1.relations)(index_1.profileGenre, ({ one }) => ({
    profile: one(index_1.profile, {
        fields: [index_1.profileGenre.profileId],
        references: [index_1.profile.id]
    }),
}));
exports.profileLanguageRelations = (0, relations_1.relations)(index_1.profileLanguage, ({ one }) => ({
    profile: one(index_1.profile, {
        fields: [index_1.profileLanguage.profileId],
        references: [index_1.profile.id]
    }),
}));
