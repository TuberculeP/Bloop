import path from "path";
import type { DataSourceOptions } from "typeorm";
import entities from "./entities";

// Shared by the app and the migration CLI
export const postgresOptions = (url: string): DataSourceOptions => ({
  type: "postgres",
  url,
  synchronize: false,
  entities,
  // .ts through ts-node, .js once compiled to dist/
  migrations: [path.join(__dirname, "migrations", "*.{ts,js}")],
  migrationsTableName: "migration_table",
});
