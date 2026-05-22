import { MongoClient, type Collection, type Db } from 'mongodb';
import type { AppEnv } from '../config/env.js';
import type { AppLogger } from '../logger/logger.js';
import { toMongoJsonSchema } from './json-schema.js';
import { withRetry, type RetryOptions } from './retry.js';
import { COLLECTION_DEFINITIONS, adminsCollection, type Admin } from './schema/index.js';

// Mongo is often still booting when the app starts (e.g. `docker compose up`),
// so retry with backoff before giving up on the first failed connect.
const CONNECT_RETRY: Omit<RetryOptions, 'onRetry'> = {
    attempts: 5,
    baseDelayMs: 500,
    maxDelayMs: 10_000,
};

export type AppCollections = {
    admins: Collection<Admin>;
};

export type DatabaseConnection = {
    client: MongoClient;
    db: Db;
    collections: AppCollections;
    close: () => Promise<void>;
};

// Strip user:password from a connection string before logging it.
const redactMongoUri = (uri: string) => uri.replace(/\/\/[^/@]+@/, '//***@');

const buildCollections = (db: Db): AppCollections => ({
    admins: db.collection<Admin>(adminsCollection.name),
});

// Apply each collection's $jsonSchema validator and indexes. Idempotent, so it's
// safe on every startup. Only adds/updates — never drops what you removed.
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
    retry: Omit<RetryOptions, 'onRetry'> = CONNECT_RETRY,
): Promise<DatabaseConnection> => {
    const client = new MongoClient(env.MONGO_URI, { appName: 'ds-tg-bot-template' });
    const db = client.db(env.MONGO_DB_NAME);

    try {
        await withRetry(
            async () => {
                await client.connect();
                await db.command({ ping: 1 });
            },
            {
                ...retry,
                onRetry: ({ attempt, nextDelayMs, error }) =>
                    logger.warn(
                        { attempt, attempts: retry.attempts, nextDelayMs, err: error },
                        'MongoDB connection failed, retrying',
                    ),
            },
        );
    } catch (error) {
        logger.error(
            { uri: redactMongoUri(env.MONGO_URI), err: error },
            'Cannot reach MongoDB. Run `docker compose up` (it starts Mongo for you), or start a local mongod and check MONGO_URI in .env.',
        );
        // The driver keeps a socket open even when connect rejects; close it so we don't leak.
        await client.close().catch(() => undefined);
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
