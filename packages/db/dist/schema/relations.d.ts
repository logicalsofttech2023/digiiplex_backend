export declare const castRelations: import("drizzle-orm/relations").Relations<"Cast", {
    movie: import("drizzle-orm/relations").One<"Movie", true>;
}>;
export declare const movieRelations: import("drizzle-orm/relations").Relations<"Movie", {
    casts: import("drizzle-orm/relations").Many<"Cast">;
    videos: import("drizzle-orm/relations").Many<"Video">;
}>;
export declare const videoRelations: import("drizzle-orm/relations").Relations<"Video", {
    movie: import("drizzle-orm/relations").One<"Movie", true>;
    videoQualities: import("drizzle-orm/relations").Many<"VideoQuality">;
}>;
export declare const videoQualityRelations: import("drizzle-orm/relations").Relations<"VideoQuality", {
    video: import("drizzle-orm/relations").One<"Video", true>;
}>;
export declare const profileRelations: import("drizzle-orm/relations").Relations<"Profile", {
    authUser: import("drizzle-orm/relations").One<"AuthUser", true>;
    profileGenres: import("drizzle-orm/relations").Many<"ProfileGenre">;
    profileLanguages: import("drizzle-orm/relations").Many<"ProfileLanguage">;
}>;
export declare const authUserRelations: import("drizzle-orm/relations").Relations<"AuthUser", {
    profiles: import("drizzle-orm/relations").Many<"Profile">;
}>;
export declare const profileGenreRelations: import("drizzle-orm/relations").Relations<"ProfileGenre", {
    profile: import("drizzle-orm/relations").One<"Profile", true>;
}>;
export declare const profileLanguageRelations: import("drizzle-orm/relations").Relations<"ProfileLanguage", {
    profile: import("drizzle-orm/relations").One<"Profile", true>;
}>;
