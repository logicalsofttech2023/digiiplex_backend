import "dotenv/config";
import mongoose from "mongoose";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import { MongoDB_URL } from "../constants/constant.js";
import * as schema from "../db/schema.js";
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL is not defined in environment variables");
}
export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });
export const connectPostgresDB = async () => {
    try {
        await db.execute(sql `SELECT 1`);
        console.log("PostgreSQL Connected");
    }
    catch (error) {
        console.error("DB Connection Error", error);
        process.exit(1);
    }
};
export const connectDB = async () => {
    try {
        if (!MongoDB_URL.URL) {
            throw new Error("MONGO_URI is missing in .env");
        }
        await mongoose.connect(MongoDB_URL.URL);
        console.log("Connected to MongoDB");
    }
    catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
};
//# sourceMappingURL=db.js.map