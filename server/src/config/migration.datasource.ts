import "reflect-metadata";
import "dotenv/config";
import { DataSource } from "typeorm";
import { postgresOptions } from "./db.options";

// Deployment data source (`migration:run:prod`): migrates the current environment's database
const { POSTGRES_URL } = process.env;

if (!POSTGRES_URL) {
  throw new Error("POSTGRES_URL is required to run migrations.");
}

export default new DataSource(postgresOptions(POSTGRES_URL));
