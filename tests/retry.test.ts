import assert from 'node:assert/strict';
import test from 'node:test';
import { withRetry, type RetryAttempt } from '../src/db/retry.js';

const noSleep = () => Promise.resolve();

test('returns the result of the first successful attempt without retrying', async () => {
    let calls = 0;

    const result = await withRetry(
        () => {
            calls++;
            return Promise.resolve('ok');
        },
        { attempts: 3, baseDelayMs: 1, maxDelayMs: 10, sleep: noSleep },
    );

    assert.equal(result, 'ok');
    assert.equal(calls, 1);
});

test('retries until an attempt succeeds', async () => {
    let calls = 0;

    const result = await withRetry(
        () => {
            calls++;
            return calls < 3 ? Promise.reject(new Error('boom')) : Promise.resolve('ok');
        },
        { attempts: 5, baseDelayMs: 1, maxDelayMs: 10, sleep: noSleep },
    );

    assert.equal(result, 'ok');
    assert.equal(calls, 3);
});

test('throws the last error after exhausting all attempts', async () => {
    let calls = 0;

    await assert.rejects(
        withRetry(
            () => {
                calls++;
                return Promise.reject(new Error(`fail-${calls}`));
            },
            { attempts: 3, baseDelayMs: 1, maxDelayMs: 10, sleep: noSleep },
        ),
        /fail-3/,
    );
    assert.equal(calls, 3);
});

test('backs off exponentially up to maxDelayMs', async () => {
    const delays: number[] = [];
    const attempts: RetryAttempt[] = [];

    await assert.rejects(
        withRetry(() => Promise.reject(new Error('boom')), {
            attempts: 5,
            baseDelayMs: 100,
            maxDelayMs: 350,
            onRetry: (attempt) => attempts.push(attempt),
            sleep: (ms) => {
                delays.push(ms);
                return Promise.resolve();
            },
        }),
    );

    // 100, 200, then capped at 350 (would be 400, 800).
    assert.deepEqual(delays, [100, 200, 350, 350]);
    assert.deepEqual(
        attempts.map((a) => a.attempt),
        [1, 2, 3, 4],
    );
});
