import { pgSchema, uuid, text, boolean, timestamp, } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
export const adminService = pgSchema("admin_service");
export const admins = adminService.table("Admin", {
    id: uuid("id").default(sql `gen_random_uuid()`).primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
    role: text("role").notNull().default("admin"),
    createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).defaultNow().notNull(),
});
export const creators = adminService.table("Creator", {
    id: uuid("id").default(sql `gen_random_uuid()`).primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
    role: text("role").default("creator"),
    emailVerified: boolean("email_verified").notNull().default(false),
    emailVerificationToken: text("email_verification_token"),
    emailVerificationExpires: timestamp("email_verification_expires", {
        withTimezone: false,
    }),
    createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).defaultNow().notNull(),
});
export const genres = adminService.table("Genre", {
    id: uuid("id").default(sql `gen_random_uuid()`).primaryKey(),
    name: text("name").notNull().unique(),
    image: text("image").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).defaultNow().notNull(),
});
export const languages = adminService.table("Language", {
    id: uuid("id").default(sql `gen_random_uuid()`).primaryKey(),
    name: text("name").notNull().unique(),
    image: text("image").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).defaultNow().notNull(),
});
//# sourceMappingURL=schema1.js.map