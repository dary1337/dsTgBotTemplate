import assert from 'node:assert/strict';
import test from 'node:test';
import { loadEnv, loadLoggerEnv } from '../src/config/env.js';

const withEnv = async (
    values: Record<string, string | undefined>,
    run: () => void | Promise<void>,
) => {
    const snapshot = { ...process.env };

    try {
        for (const [key, value] of Object.entries(values)) {
            if (value === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        }

        await run();
    } finally {
        for (const key of Object.keys(process.env)) {
            if (!(key in snapshot)) {
                delete process.env[key];
            }
        }

        for (const [key, value] of Object.entries(snapshot)) {
            if (value === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        }
    }
};

test('loadEnv accepts legacy DB aliases and requires at least one token', async () => {
    await withEnv(
        {
            DS_BOT_TOKEN: undefined,
            TG_BOT_TOKEN: 'telegram-token',
            DB_URI: 'mongodb://example:27017',
            DB_NAME: 'legacy-name',
            MONGO_URI: undefined,
            MONGO_DB_NAME: undefined,
        },
        () => {
            const env = loadEnv();

            assert.equal(env.MONGO_URI, 'mongodb://example:27017');
            assert.equal(env.MONGO_DB_NAME, 'legacy-name');
            assert.equal(env.TG_BOT_TOKEN, 'telegram-token');
        },
    );
});

test('loadEnv rejects startup without bot tokens', async () => {
    await withEnv(
        {
            DS_BOT_TOKEN: undefined,
            TG_BOT_TOKEN: undefined,
            DB_URI: 'mongodb://example:27017',
            DB_NAME: 'legacy-name',
        },
        () => {
            assert.throws(
                () => loadEnv(),
                (error: unknown) =>
                    error instanceof Error &&
                    error.name === 'EnvValidationError' &&
                    error.message.includes('At least one bot token must be provided.'),
            );
        },
    );
});

test('loadLoggerEnv falls back to safe defaults and reports issues on invalid values', async () => {
    await withEnv(
        {
            LOG_LEVEL: 'not-a-real-level',
            LOG_DIR: '',
        },
        () => {
            const { env, issues } = loadLoggerEnv();

            assert.deepEqual(env, { LOG_LEVEL: 'info', LOG_DIR: 'logs' });
            assert.ok(issues.length > 0, 'expected validation issues to be reported');
            assert.ok(issues.some((issue) => issue.startsWith('LOG_LEVEL')));
        },
    );
});

test('loadLoggerEnv reports no issues for a clean environment', async () => {
    await withEnv({ LOG_LEVEL: 'debug', LOG_DIR: 'logs' }, () => {
        const { env, issues } = loadLoggerEnv();

        assert.deepEqual(env, { LOG_LEVEL: 'debug', LOG_DIR: 'logs' });
        assert.deepEqual(issues, []);
    });
});
