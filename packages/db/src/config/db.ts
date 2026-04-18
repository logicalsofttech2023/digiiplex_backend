import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import * as authSchema from "../schema/AuthService/authSchema.js";
import * as adminSchema from "../schema/AdminService/adminSchema.js";
import * as uploadSchema from "../schema/UploadService/uploadSchema.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined.");
}

export const pool = new Pool({
  connectionString,
});

const schema = {
  ...authSchema,
  ...adminSchema,
  ...uploadSchema,
};

export const db = drizzle(pool, { schema });

export const connectPostgresDB = async (): Promise<void> => {
  try {
    await db.execute(sql`SELECT 1`);
    console.log("PostgreSQL Connected");
  } catch (error) {
    console.error("DB Connection Error", error);
    process.exit(1);
  }
};
