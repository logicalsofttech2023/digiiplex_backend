import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const subscriptionPlans = pgTable("SubscriptionPlan", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  price: integer("price").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: false }).defaultNow().notNull(),
});
