"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.test = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.test = (0, pg_core_1.pgTable)("Test", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    name: (0, pg_core_1.text)("name"),
});
