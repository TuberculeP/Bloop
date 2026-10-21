import "reflect-metadata";
import "dotenv/config";
import { DataSource } from "typeorm";
import entities from "./entities";
import { postgresOptions } from "./db.options";

const { POSTGRES_URL } = process.env;

let pg: DataSource;

if (POSTGRES_URL) {
  // Schema managed by migrations (see migrations/README.md)
  pg = new DataSource(postgresOptions(POSTGRES_URL));
} else {
  // Local dev: schema synced from entities
  console.warn("POSTGRES_URL not provided. Falling back to SQLite.");
  pg = new DataSource({
    type: "sqlite",
    database: "sqlite.db",
    synchronize: true,
    entities,
  });
}

export default pg;
