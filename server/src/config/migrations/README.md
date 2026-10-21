# TypeORM migrations

On Postgres (staging, prod), the schema is managed only by the migrations in this folder (`synchronize: false`).
In local dev on SQLite (no `POSTGRES_URL`), the schema is synced from the entities and migrations are not used.

## After changing an entity

```bash
npm run migration:db:start                                        # throwaway Postgres on localhost:5433
npm run migration:generate -- server/src/config/migrations/<Name> # e.g. AddBioToUser
npm run migration:db:stop
```

`migration:generate` applies the existing migrations to the throwaway database, then writes the diff between that schema and the entities to a new file. Review the generated migration before committing it.

Local commands (`migration:run`, `migration:generate`, `migration:revert`) use `migration.local.datasource.ts`. They always target the throwaway database and ignore `POSTGRES_URL`.

Rules:

- Migrations are never generated from a real database (staging, prod). They live in Git with the code, and each environment applies the ones it has not run yet.
- A migration that has run anywhere is never edited. Create a new one instead.

### What `migration:generate` cannot do

- **Removed entity**: TypeORM ignores tables it does not know, so it never generates `DROP TABLE`. Write the migration by hand (`npm run migration:create -- server/src/config/migrations/<Name>`) using `queryRunner.dropTable(name, true, true, true)`, dropping join tables before parent tables.
- **Renamed column**: generated as drop + add, which loses data. Replace it with `ALTER TABLE ... RENAME COLUMN`.

## Deployment

The Dockerfile `CMD` runs `npm run migration:run:prod && npm start`:

- `migration:run:prod` uses `migration.datasource.ts` (compiled to `dist/`) and the environment's `POSTGRES_URL`.
- Executed migrations are recorded in `migration_table`, so each one runs once per database.
- A failing migration is rolled back and the container exits before the app starts, so Coolify keeps the previous version running.
- During the rolling update, the previous version briefly runs against the new schema. Keep migrations backward compatible: add nullable columns, and drop old ones in a later release.

Coolify's pre-deployment command is not used: it runs in the currently deployed container, which does not contain the new migrations.

## Baseline

`*-InitialSchema.ts` creates the full schema on an empty database. It is a no-op when the `user` table already exists.
