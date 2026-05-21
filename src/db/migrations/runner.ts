import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Db } from 'mongodb';
import type { AppLogger } from '../../logger/logger.js';

const RUNNER_DIR = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(RUNNER_DIR, '../../_migrations');
const APPLIED_COLLECTION = 'migrations';
const MIGRATION_FILE_PATTERN = /^\d+_[a-z0-9_]+\.(js|mjs|cjs|ts)$/;

// Each migration file exports `up` (and optionally `down`) and receives the
// raw Db handle, so it can touch any collection — not just the ones in the
// schema registry. The migration id is its filename.
export type MigrationContext = {
    db: Db;
    logger: AppLogger;
};

export type MigrationModule = {
    up: (context: MigrationContext) => Promise<void>;
    down?: (context: MigrationContext) => Promise<void>;
};

type AppliedMigration = {
    _id: string;
    appliedAt: Date;
};

const loadMigrationFiles = async (): Promise<string[]> => {
    const entries = await readdir(MIGRATIONS_DIR);

    return entries
        .filter((file) => MIGRATION_FILE_PATTERN.test(file))
        .sort((a, b) => a.localeCompare(b));
};

const importMigration = async (file: string): Promise<MigrationModule> => {
    const moduleUrl = pathToFileURL(path.join(MIGRATIONS_DIR, file)).href;
    const loaded = (await import(moduleUrl)) as Partial<MigrationModule>;

    if (typeof loaded.up !== 'function') {
        throw new Error(`Migration "${file}" must export an async "up" function.`);
    }

    return loaded as MigrationModule;
};

export const runMigrations = async (db: Db, logger: AppLogger) => {
    const applied = db.collection<AppliedMigration>(APPLIED_COLLECTION);
    const appliedIds = new Set(await applied.distinct('_id'));
    const files = await loadMigrationFiles();

    for (const file of files) {
        const id = file.replace(/\.(js|mjs|cjs|ts)$/, '');

        if (appliedIds.has(id)) {
            continue;
        }

        const migrationLogger = logger.child({ migration: id });
        const migration = await importMigration(file);

        migrationLogger.info('Applying migration');
        await migration.up({ db, logger: migrationLogger });
        await applied.insertOne({ _id: id, appliedAt: new Date() });
        migrationLogger.info('Migration applied');
    }

    logger.info({ count: files.length }, 'Migrations up to date');
};
