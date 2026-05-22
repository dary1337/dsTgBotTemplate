// EXAMPLE — copy to: src/_migrations/002_<name>.ts
// Tracked in the migrations collection, so up() runs exactly once.
import type { MigrationContext } from '../../src/db/migrations/runner.js';

export const up = async ({ db, logger }: MigrationContext) => {
    const result = await db
        .collection('admins')
        .updateMany({ updatedAt: { $exists: false } }, [{ $set: { updatedAt: '$createdAt' } }]);

    logger.info({ modified: result.modifiedCount }, 'Backfilled admins.updatedAt');
};

export const down = async ({ db }: MigrationContext) => {
    await db.collection('admins').updateMany({}, { $unset: { updatedAt: '' } });
};
