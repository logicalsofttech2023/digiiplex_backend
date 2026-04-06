import { pgSchema, uuid, text, boolean, timestamp, index, uniqueIndex, } from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
export const authService = pgSchema("auth_service");
// ================= USERS =================
export const authUsers = authService.table("auth_users", {
    id: uuid("id")
        .default(sql `gen_random_uuid()`)
        .primaryKey(),
    phone: text("phone").notNull(),
    email: text("email"),
    fullName: text("full_name"),
    dob: text("dob"),
    role: text("role").notNull().default("user"),
    otp: text("otp"),
    expiresAt: timestamp("expires_at"),
    isVerified: boolean("is_verified").default(false),
    isActive: boolean("is_active").default(true),
    isDeleted: boolean("is_deleted").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
    phoneUnique: uniqueIndex("users_phone_unique").on(t.phone),
    emailUnique: uniqueIndex("users_email_unique").on(t.email),
    phoneIdx: index("users_phone_idx").on(t.phone),
    otpIdx: index("users_otp_idx").on(t.otp),
}));
// ================= PROFILES =================
export const profiles = authService.table("profiles", {
    id: uuid("id")
        .default(sql `gen_random_uuid()`)
        .primaryKey(),
    userId: uuid("user_id")
        .notNull()
        .references(() => authUsers.id, { onDelete: "cascade" }),
    profileName: text("profile_name").notNull(),
    profileImg: text("profile_img"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
    userIdx: index("profiles_user_idx").on(t.userId),
}));
// ================= PROFILE LANGUAGES =================
export const profileLanguages = authService.table("profile_languages", {
    id: uuid("id")
        .default(sql `gen_random_uuid()`)
        .primaryKey(),
    profileId: uuid("profile_id")
        .notNull()
        .references(() => profiles.id, { onDelete: "cascade" }),
    languageId: uuid("language_id").notNull(),
}, (t) => ({
    profileIdx: index("pl_profile_idx").on(t.profileId),
}));
// ================= PROFILE GENRES =================
export const profileGenres = authService.table("profile_genres", {
    id: uuid("id")
        .default(sql `gen_random_uuid()`)
        .primaryKey(),
    profileId: uuid("profile_id")
        .notNull()
        .references(() => profiles.id, { onDelete: "cascade" }),
    genreId: uuid("genre_id").notNull(),
}, (t) => ({
    profileIdx: index("pg_profile_idx").on(t.profileId),
}));
// ================= RELATIONS =================
// User → Profiles
export const authUsersRelations = relations(authUsers, ({ many }) => ({
    profiles: many(profiles),
}));
// Profile → User + Languages + Genres
export const profilesRelations = relations(profiles, ({ one, many }) => ({
    user: one(authUsers, {
        fields: [profiles.userId],
        references: [authUsers.id],
    }),
    profileLanguages: many(profileLanguages),
    profileGenres: many(profileGenres),
}));
// ProfileLanguage → Profile
export const profileLanguagesRelations = relations(profileLanguages, ({ one }) => ({
    profile: one(profiles, {
        fields: [profileLanguages.profileId],
        references: [profiles.id],
    }),
}));
// ProfileGenre → Profile
export const profileGenresRelations = relations(profileGenres, ({ one }) => ({
    profile: one(profiles, {
        fields: [profileGenres.profileId],
        references: [profiles.id],
    }),
}));
//# sourceMappingURL=schema.js.map