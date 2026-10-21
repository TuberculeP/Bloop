import "reflect-metadata";
import { DataSource } from "typeorm";
import { postgresOptions } from "./db.options";

// DataSource de développement : cible toujours le Postgres jetable lancé par
// `npm run migration:db:start`, jamais POSTGRES_URL. Ainsi, générer une migration
// ne peut pas toucher staging ou la prod, même si POSTGRES_URL est défini localement.
export default new DataSource(
  postgresOptions("postgres://postgres:postgres@localhost:5433/postgres"),
);
