import { relations } from "drizzle-orm/relations";
import { movie, cast, video, videoQuality, authUser, profile, profileGenre, profileLanguage } from "./index.js";
export const castRelations = relations(cast, ({ one }) => ({
    movie: one(movie, {
        fields: [cast.movieId],
        references: [movie.id]
    }),
}));
export const movieRelations = relations(movie, ({ many }) => ({
    casts: many(cast),
    videos: many(video),
}));
export const videoRelations = relations(video, ({ one, many }) => ({
    movie: one(movie, {
        fields: [video.movieId],
        references: [movie.id]
    }),
    videoQualities: many(videoQuality),
}));
export const videoQualityRelations = relations(videoQuality, ({ one }) => ({
    video: one(video, {
        fields: [videoQuality.videoId],
        references: [video.id]
    }),
}));
export const profileRelations = relations(profile, ({ one, many }) => ({
    authUser: one(authUser, {
        fields: [profile.userId],
        references: [authUser.id]
    }),
    profileGenres: many(profileGenre),
    profileLanguages: many(profileLanguage),
}));
export const authUserRelations = relations(authUser, ({ many }) => ({
    profiles: many(profile),
}));
export const profileGenreRelations = relations(profileGenre, ({ one }) => ({
    profile: one(profile, {
        fields: [profileGenre.profileId],
        references: [profile.id]
    }),
}));
export const profileLanguageRelations = relations(profileLanguage, ({ one }) => ({
    profile: one(profile, {
        fields: [profileLanguage.profileId],
        references: [profile.id]
    }),
}));
