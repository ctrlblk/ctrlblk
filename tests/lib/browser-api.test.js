// Unit tests for src/js/lib/browser-api.js
// Run with: node --test tests/lib/browser-api.test.js

import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const srcPath = new URL('../../src/js/lib/browser-api.js', import.meta.url);

describe('browser-api.js', () => {
    let src;
    async function getSrc() {
        if (!src) { src = await fs.readFile(srcPath, 'utf8'); }
        return src;
    }

    describe('exports', () => {
        it('should export all expected symbols', async () => {
            const s = await getSrc();
            const expected = [
                'browser', 'dnr', 'i18n', 'runtime',
                'sendMessage',
                'localRead', 'localWrite', 'localRemove',
                'sessionRead', 'sessionWrite',
                'adminRead',
            ];
            for (const name of expected) {
                assert.match(s, new RegExp(`export\\s+(const|function|async function)\\s+${name}\\b`),
                    `should export ${name}`);
            }
        });

        it('should not contain uBO references', async () => {
            const s = await getSrc();
            assert.ok(!s.includes('uBlock Origin Lite'));
            assert.ok(!s.includes('uBOLite'));
        });
    });

    describe('sendMessage retry logic', () => {
        it('should define sendMessage with retry loop', async () => {
            const s = await getSrc();
            // Verify retry pattern exists: decrement counter and setTimeout
            assert.ok(s.includes('i -= 1'), 'should have retry counter decrement');
            assert.ok(s.includes('setTimeout(send'), 'should retry with setTimeout');
            assert.ok(s.includes('i <= 0'), 'should have retry exhaustion check');
        });

        it('should retry up to 5 times', async () => {
            const s = await getSrc();
            assert.ok(s.includes('let i = 5'), 'should start with 5 retries');
        });
    });

    describe('storage helpers defensive checks', () => {
        it('localRead should check storage availability before access', async () => {
            const s = await getSrc();
            const fn = s.slice(s.indexOf('async function localRead'), s.indexOf('async function localWrite'));
            assert.ok(fn.includes('browser.storage instanceof Object'), 'should check storage exists');
            assert.ok(fn.includes('browser.storage.local instanceof Object'), 'should check storage.local exists');
            assert.ok(fn.includes('try'), 'should have try-catch');
        });

        it('sessionRead should check session storage availability', async () => {
            const s = await getSrc();
            const fn = s.slice(s.indexOf('async function sessionRead'), s.indexOf('async function sessionWrite'));
            assert.ok(fn.includes('browser.storage.session instanceof Object'), 'should check storage.session exists');
        });

        it('adminRead should check managed storage availability', async () => {
            const s = await getSrc();
            const fn = s.slice(s.indexOf('async function adminRead'));
            assert.ok(fn.includes('browser.storage.managed instanceof Object'), 'should check storage.managed exists');
        });
    });

    describe('browser detection', () => {
        it('should handle service worker environment (no Element)', async () => {
            const s = await getSrc();
            assert.ok(s.includes("typeof Element === 'undefined'"),
                'should check typeof Element for service worker safety');
        });

        it('should fallback to chrome if browser is not available', async () => {
            const s = await getSrc();
            assert.ok(s.includes('self.chrome'), 'should fallback to self.chrome');
        });
    });
});
