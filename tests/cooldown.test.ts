import assert from 'node:assert/strict';
import test from 'node:test';
import { CooldownStore } from '../examples/cooldowns/cooldown-store.js';

test('allows the first hit and blocks within the window', () => {
    const store = new CooldownStore(10_000);

    assert.equal(store.take('user').allowed, true);

    const second = store.take('user');
    assert.equal(second.allowed, false);
    assert.ok(second.retryAfterMs > 0 && second.retryAfterMs <= 10_000);
});

test('keys are independent and clear() resets one', () => {
    const store = new CooldownStore(10_000);

    assert.equal(store.take('a').allowed, true);
    assert.equal(store.take('b').allowed, true);

    store.clear('a');
    assert.equal(store.take('a').allowed, true);
    assert.equal(store.take('b').allowed, false);
});
