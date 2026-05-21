import assert from 'node:assert/strict';
import test from 'node:test';
import { runBroadcast } from '../examples/discord-broadcast/broadcast-engine.js';

test('sends to every recipient', async () => {
    const sent: string[] = [];
    const stats = await runBroadcast({
        recipientIds: ['1', '2', '3'],
        control: { paused: false, canceled: false },
        send: async (id) => {
            sent.push(id);
        },
        classify: () => ({ status: 'failed' }),
        minGapMs: 0,
        maxPerHour: 1_000_000, // keep the test fast (no real pacing delay)
    });

    assert.deepEqual(sent, ['1', '2', '3']);
    assert.equal(stats.sent, 3);
    assert.equal(stats.failed, 0);
    assert.equal(stats.stoppedEarly, false);
});

test('counts and classifies failures without stopping', async () => {
    const stats = await runBroadcast({
        recipientIds: ['1', '2'],
        control: { paused: false, canceled: false },
        send: async (id) => {
            if (id === '2') {
                throw new Error('cannot DM');
            }
        },
        classify: () => ({ status: 'blocked' }),
        minGapMs: 0,
        maxPerHour: 1_000_000, // keep the test fast (no real pacing delay)
    });

    assert.equal(stats.sent, 1);
    assert.equal(stats.failed, 1);
    assert.equal(stats.stoppedEarly, false);
});

test('a critical failure stops the whole run', async () => {
    const sent: string[] = [];
    const stats = await runBroadcast({
        recipientIds: ['1', '2', '3'],
        control: { paused: false, canceled: false },
        send: async (id) => {
            if (id === '1') {
                throw new Error('quarantine');
            }
            sent.push(id);
        },
        classify: () => ({ status: 'failed', critical: true }),
        minGapMs: 0,
        maxPerHour: 1_000_000, // keep the test fast (no real pacing delay)
    });

    assert.equal(stats.stoppedEarly, true);
    assert.equal(sent.length, 0);
});

test('retryAfterMs retries the same recipient', async () => {
    let attempts = 0;
    const stats = await runBroadcast({
        recipientIds: ['1'],
        control: { paused: false, canceled: false },
        send: async () => {
            attempts += 1;
            if (attempts === 1) {
                throw new Error('429');
            }
        },
        classify: () =>
            attempts === 1 ? { status: 'failed', retryAfterMs: 1 } : { status: 'failed' },
        minGapMs: 0,
        maxPerHour: 1_000_000, // keep the test fast (no real pacing delay)
    });

    assert.equal(attempts, 2);
    assert.equal(stats.sent, 1);
});
