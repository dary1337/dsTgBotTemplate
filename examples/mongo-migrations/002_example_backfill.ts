// EXAMPLE — copy to: src/_migrations/002_<name>.ts
// A data migration in the ModsBot style: it gets the raw Db handle and is
// tracked in the `migrations` collection, so it runs exactly once.
import type { MigrationContext } from '../../src/db/migrations/runner.js';

export const up = async ({ db, logger }: MigrationContext) => {
    // Backfill: give every admin document an `updatedAt` if it is missing.
    const result = await db
        .collection('admins')
        .updateMany({ updatedAt: { $exists: false } }, [{ $set: { updatedAt: '$createdAt' } }]);

    logger.info({ modified: result.modifiedCount }, 'Backfilled admins.updatedAt');
};

export const down = async ({ db }: MigrationContext) => {
    await db.collection('admins').updateMany({}, { $unset: { updatedAt: '' } });
};
