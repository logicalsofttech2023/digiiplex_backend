import { pgSchema, uuid, text, timestamp, index, uniqueIndex, } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
export const keyManagementService = pgSchema("key_management_service");
// =================  =================
export const keys = keyManagementService.table("Key", {
    id: uuid("id").default(sql `gen_random_uuid()`).primaryKey(),
    kid: text("kid").notNull(),
    publicKey: text("public_key").notNull(),
    privateKey: text("private_key").notNull(),
    status: text("status").notNull(), // active, inactive
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
    kidUnique: uniqueIndex("keys_kid_unique").on(t.kid),
    kidIdx: index("keys_kid_idx").on(t.kid),
}));
//# sourceMappingURL=schema.js.map