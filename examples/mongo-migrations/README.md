# MongoDB migrations

The core already runs migrations on startup (`src/db/migrations/runner.ts`). Migrations
live in `src/_migrations/`, are named `NNN_snake_case.ts`, export an async `up` (and
optional `down`), receive the raw `Db` handle, and are tracked once-applied in the
`migrations` collection.

Two kinds of migration:

- **Schema/index changes** — usually you don't need a migration: declare indexes in
  `src/db/schema/<name>.ts` and `syncSchema` applies them every startup.
- **Data changes** — backfills, renames, cleanups. Use a migration like
  `002_example_backfill.ts` in this folder.

Copy `002_example_backfill.ts` to `src/_migrations/002_<name>.ts` and adapt it.
