import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAdminFilter } from '../src/db/repositories/admins.js';
import { adminSchema } from '../src/db/schema/admins.js';
import { TELEGRAM_COMMANDS, formatTelegramCommands } from '../src/tg-bot/commands.js';

test('formats telegram commands from the shared command list', () => {
    assert.deepEqual(formatTelegramCommands(), [
        '/start - Show the welcome message',
        '/ping - Check bot availability',
    ]);
    const [first] = TELEGRAM_COMMANDS;
    assert.ok(first, 'expected at least one telegram command');
    assert.equal(formatTelegramCommands()[0], `/${first.command} - ${first.description}`);
});

test('builds admin filters with telegram as the default platform', () => {
    assert.deepEqual(buildAdminFilter('123'), { platform: 'telegram', userId: '123' });
});

test('admin schema accepts a valid document and rejects an unknown platform', () => {
    const now = new Date();
    const valid = adminSchema.parse({
        platform: 'telegram',
        userId: '123',
        source: 'migration',
        createdBy: 'test',
        createdAt: now,
    });

    assert.equal(valid.userId, '123');
    assert.throws(() =>
        adminSchema.parse({
            platform: 'irc',
            userId: '123',
            source: 'migration',
            createdBy: 'test',
            createdAt: now,
        }),
    );
});
