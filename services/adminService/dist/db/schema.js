import { pgSchema, uuid, text, boolean, timestamp, index, uniqueIndex, } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
export const adminService = pgSchema("admin_service");
// ================= ADMINS =================
export const admins = adminService.table("admins", {
    id: uuid("id").default(sql `gen_random_uuid()`).primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    password: text("password").notNull(),
    role: text("role").notNull().default("admin"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
    emailUnique: uniqueIndex("admins_email_unique").on(t.email),
    emailIdx: index("admins_email_idx").on(t.email),
}));
// ================= CREATORS =================
export const creators = adminService.table("creators", {
    id: uuid("id").default(sql `gen_random_uuid()`).primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    password: text("password").notNull(),
    role: text("role").default("creator"),
    emailVerified: boolean("email_verified").notNull().default(false),
    emailVerificationToken: text("email_verification_token"),
    emailVerificationExpires: timestamp("email_verification_expires"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
    emailUnique: uniqueIndex("creators_email_unique").on(t.email),
    emailIdx: index("creators_email_idx").on(t.email),
}));
// ================= GENRES =================
export const genres = adminService.table("genres", {
    id: uuid("id").default(sql `gen_random_uuid()`).primaryKey(),
    name: text("name").notNull(),
    image: text("image").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
    nameUnique: uniqueIndex("genres_name_unique").on(t.name),
    nameIdx: index("genres_name_idx").on(t.name),
}));
// ================= LANGUAGES =================
export const languages = adminService.table("languages", {
    id: uuid("id").default(sql `gen_random_uuid()`).primaryKey(),
    name: text("name").notNull(),
    image: text("image").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
    nameUnique: uniqueIndex("languages_name_unique").on(t.name),
    nameIdx: index("languages_name_idx").on(t.name),
}));
//# sourceMappingURL=schema.js.map