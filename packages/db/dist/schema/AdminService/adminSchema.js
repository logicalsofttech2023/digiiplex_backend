import { pgSchema, uuid, text, boolean, timestamp, index, uniqueIndex, } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
export const adminService = pgSchema("admin_service");
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
