import "dotenv/config";
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
