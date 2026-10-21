import path from "path";
import type { DataSourceOptions } from "typeorm";
import entities from "./entities";

// Config Postgres partagée entre l'app (db.config.ts) et la CLI de migrations
// (migration.datasource.ts), pour qu'elles ne divergent jamais.
export const postgresOptions = (url: string): DataSourceOptions => ({
  type: "postgres",
  url,
  synchronize: false,
  entities,
  // .ts en dev (ts-node), .js une fois compilé dans dist/
  migrations: [path.join(__dirname, "migrations", "*.{ts,js}")],
  migrationsTableName: "migration_table",
});
