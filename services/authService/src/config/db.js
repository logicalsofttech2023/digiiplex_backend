import { Sequelize } from "sequelize";

export const sequelize = new Sequelize(
  process.env.POSTGRES_DB,
  process.env.POSTGRES_USER,
  process.env.POSTGRES_PASSWORD,
  {
    host: "postgres",
    dialect: "postgres",
  }
);

export const connectPostgres = async () => {
  try {
    await sequelize.authenticate();
    console.log("PostgreSQL connected");
  } catch (err) {
    console.error("Postgres connection error", err);
  }
};