import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const streamAssets = pgTable("StreamAsset", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  streamUrl: text("streamUrl").notNull().unique(),
  createdAt: timestamp("createdAt", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: false }).defaultNow().notNull(),
});
