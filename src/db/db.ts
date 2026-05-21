import { MongoClient, type Collection, type Db } from 'mongodb';
import type { AppEnv } from '../config/env.js';
import type { AppLogger } from '../logger/logger.js';
import { toMongoJsonSchema } from './json-schema.js';
import { COLLECTION_DEFINITIONS, adminsCollection, type Admin } from './schema/index.js';

export type AppCollections = {
    admins: Collection<Admin>;
};

export type DatabaseConnection = {
    client: MongoClient;
    db: Db;
    collections: AppCollections;
    close: () => Promise<void>;
};

// Hide any user:password in a connection string before it reaches the logs.
const redactMongoUri = (uri: string) => uri.replace(/\/\/[^/@]+@/, '//***@');

const buildCollections = (db: Db): AppCollections => ({
    admins: db.collection<Admin>(adminsCollection.name),
});

// For each registered collection: apply a `$jsonSchema` validator (so the DB rejects
// malformed documents) and create its indexes. Idempotent — safe on every startup.
// Note: this only adds/updates; it never drops indexes or validators you removed.
export const syncSchema = async (db: Db, logger: AppLogger) => {
    const existing = new Set(
        (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name),
    );

    for (const definition of COLLECTION_DEFINITIONS) {
        const validator = { $jsonSchema: toMongoJsonSchema(definition.schema) };

        if (existing.has(definition.name)) {
            await db.command({ collMod: definition.name, validator, validationLevel: 'moderate' });
        } else {
            await db.createCollection(definition.name, { validator, validationLevel: 'moderate' });
        }

        if (definition.indexes.length > 0) {
            await db.collection(definition.name).createIndexes(definition.indexes);
        }
    }

    logger.info({ collections: COLLECTION_DEFINITIONS.length }, 'Database schema synced');
};

export const connectDatabase = async (
    env: AppEnv,
    logger: AppLogger,
): Promise<DatabaseConnection> => {
    const client = new MongoClient(env.MONGO_URI, { appName: 'ds-tg-bot-template' });
    const db = client.db(env.MONGO_DB_NAME);

    try {
        await client.connect();
        await db.command({ ping: 1 });
    } catch (error) {
        logger.error(
            { uri: redactMongoUri(env.MONGO_URI), err: error },
            'Cannot reach MongoDB. Run `docker compose up` (it starts Mongo for you), or start a local mongod and check MONGO_URI in .env.',
        );
        throw error;
    }

    logger.info({ dbName: env.MONGO_DB_NAME }, 'MongoDB connected');

    return {
        client,
        db,
        collections: buildCollections(db),
        close: async () => {
            await client.close();
            logger.info('MongoDB connection closed');
        },
    };
};
