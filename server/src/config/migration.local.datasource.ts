import "reflect-metadata";
import { DataSource } from "typeorm";
import { postgresOptions } from "./db.options";

// Always the throwaway Postgres from `migration:db:start`, never POSTGRES_URL,
// so local migration commands cannot reach staging or prod.
export default new DataSource(
  postgresOptions("postgres://postgres:postgres@localhost:5433/postgres"),
);
