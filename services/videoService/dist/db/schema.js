import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
export const videoCatalog = pgTable("VideoCatalog", {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    status: text("status").notNull().default("draft"),
    createdAt: timestamp("createdAt", { withTimezone: false }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: false }).defaultNow().notNull(),
});
//# sourceMappingURL=schema.js.map