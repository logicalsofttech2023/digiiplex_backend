import "dotenv/config";
import mongoose from "mongoose";
import { MongoDB_URL } from "../constants/constant.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in environment variables.");
}

const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });

export const connectPostgresDB = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log("PostgreSQL Connected ✅");
  } catch (error) {
    console.error("DB Connection Error ❌", error);
    process.exit(1);
  }
};

export const connectDB = async (): Promise<void> => {
  try {
    if (!MongoDB_URL.URL) {
      throw new Error("MONGO_URI is missing in .env");
    }
    await mongoose.connect(MongoDB_URL.URL);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
};