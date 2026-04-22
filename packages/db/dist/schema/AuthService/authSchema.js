import { pgSchema, uuid, text, boolean, timestamp, index, uniqueIndex, pgEnum, } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
export const authService = pgSchema("auth_service");
export const roleEnum = pgEnum("role", [
    "USER",
    "CREATOR",
    "ADMIN",
    "SUPER_ADMIN",
]);
export const profileRoleEnum = pgEnum("profile_role", [
    "ADULT",
    "KID",
    "TEEN",
    "SENIOR",
]);
export const providerEnum = pgEnum("auth_provider", ['EMAIL', 'GOOGLE', 'FACEBOOK', 'APPLE', 'PHONE']);
export const deviceTypeEnum = pgEnum("device_type", ['MOBILE', 'WEB', 'TV', 'TABLET', 'CONSOLE', 'UNKNOWN']);
// ================= USERS =================
export const Users = authService.table("auth_users", {
    id: uuid("id")
        .default(sql `gen_random_uuid()`)
        .primaryKey(),
    phone: text("phone"),
    email: text("email"),
    password: text("password"),
    auth_provider: providerEnum("auth_provider").default("PHONE"),
    dob: text("dob"),
    role: roleEnum("role").default("USER"),
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
        .references(() => Users.id, { onDelete: "cascade" }),
    profileName: text("profile_name").notNull(),
    profileImg: text("profile_img"),
    profile_role: profileRoleEnum("profile_role").notNull().default("ADULT"),
    device_type: deviceTypeEnum("device_type").notNull().default("UNKNOWN"),
    genresIds: uuid("genres_ids").array().default([]),
    languagesIds: uuid("languages_ids").array().default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
    userIdx: index("profiles_user_idx").on(t.userId),
}));
// faqs
export const faqs = authService.table("faqs", {
    id: uuid("id")
        .default(sql `gen_random_uuid()`)
        .primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
    titleIdx: index("faqs_title_idx").on(t.title),
}));
// about us
export const aboutUs = authService.table("about_us", {
    id: uuid("id")
        .default(sql `gen_random_uuid()`)
        .primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
// privacy policy
export const privacyPolicy = authService.table("privacy_policy", {
    id: uuid("id").default(sql `gen_random_uuid()`).primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export const termsConditions = authService.table("terms_conditions", {
    id: uuid("id").default(sql `gen_random_uuid()`).primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
