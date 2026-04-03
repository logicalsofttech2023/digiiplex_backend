import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "../schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined.");
}

export const pool = new Pool({
  connectionString,
});

export const db = drizzle(pool, { schema });

export const connectPostgresDB = async (): Promise<void> => {
  try {
    await db.execute(sql`SELECT 1`);
    console.log("✅ PostgreSQL Connected");
  } catch (error) {
    console.error("❌ DB Connection Error", error);
    process.exit(1);
  }
};