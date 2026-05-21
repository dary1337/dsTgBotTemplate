import { createAdminsRepository } from '../db/repositories/admins.js';
import type { Admin } from '../db/schema/admins.js';
import type { MigrationContext } from '../db/migrations/runner.js';

const parseSeedIds = () =>
    (process.env.SEED_TG_ADMIN_IDS ?? '')
        .split(',')
        .map((id) => id.trim())
        .filter((id) => /^\d+$/.test(id));

export const up = async ({ db, logger }: MigrationContext) => {
    const ids = parseSeedIds();

    if (ids.length === 0) {
        logger.info('SEED_TG_ADMIN_IDS is empty, no admins seeded');
        return;
    }

    const admins = createAdminsRepository(db.collection<Admin>('admins'));

    for (const userId of ids) {
        await admins.add({ userId, createdBy: 'migration:001_seed_admins', source: 'migration' });
    }

    logger.info({ count: ids.length }, 'Seeded Telegram admins');
};

export const down = async ({ db }: MigrationContext) => {
    const admins = createAdminsRepository(db.collection<Admin>('admins'));
    await admins.removeManyByIds(parseSeedIds());
};
