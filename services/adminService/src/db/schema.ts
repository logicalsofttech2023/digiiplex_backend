import { pgTable, text, timestamp, boolean, uuid } from "drizzle-orm/pg-core";

export const admins = pgTable("Admin", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("admin"),
  createdAt: timestamp("createdAt", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: false }).defaultNow().notNull(),
});

export const creators = pgTable("Creator", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").default("creator"),
  emailVerified: boolean("emailVerified").notNull().default(false),
  emailVerificationToken: text("emailVerificationToken"),
  emailVerificationExpires: timestamp("emailVerificationExpires", {
    withTimezone: false,
  }),
  createdAt: timestamp("createdAt", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: false }).defaultNow().notNull(),
});

export const genres = pgTable("Genre", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  image: text("image").notNull(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: false }).defaultNow().notNull(),
});

export const languages = pgTable("Language", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  image: text("image").notNull(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: false }).defaultNow().notNull(),
});
