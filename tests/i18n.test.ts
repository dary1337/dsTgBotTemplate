import assert from 'node:assert/strict';
import test from 'node:test';
import { format, resolveLang, t } from '../examples/i18n/i18n.js';

test('resolveLang maps tags and falls back to the default locale', () => {
    assert.equal(resolveLang('ru'), 'ru');
    assert.equal(resolveLang('en-US'), 'en');
    assert.equal(resolveLang('fr'), 'en'); // unsupported -> fallback
    assert.equal(resolveLang(undefined), 'en');
});

test('t returns the locale bundle for direct, typed access', () => {
    assert.equal(t('ru').ping.reply, 'Понг.');
    assert.equal(t('en').ping.reply, 'Pong.');
});

test('format interpolates and leaves unknown placeholders untouched', () => {
    assert.equal(format(t('ru').greeting, { name: 'Yuri' }), 'Привет, Yuri!');
    assert.equal(format('Hi {name}, {missing}', { name: 'X' }), 'Hi X, {missing}');
});
