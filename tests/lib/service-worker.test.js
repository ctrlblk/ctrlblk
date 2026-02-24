// Unit tests for src/js/background/serviceWorker.js
// Run with: node --test tests/lib/service-worker.test.js

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const swPath = new URL('../../src/js/background/serviceWorker.js', import.meta.url);
const filtersPath = new URL('../../src/js/background/filters.js', import.meta.url);
const reportAdPath = new URL('../../src/js/background/reportAd.js', import.meta.url);

describe('serviceWorker.js', () => {
    let src;
    async function getSrc() {
        if (!src) { src = await fs.readFile(swPath, 'utf8'); }
        return src;
    }

    it('should not contain uBO references', async () => {
        const s = await getSrc();
        assert.ok(!s.includes('uBlock Origin Lite'));
        assert.ok(!s.includes('uBOLite'));
    });

    describe('insertCSSHandler', () => {
        it('should validate tabId is a number before calling API', async () => {
            const s = await getSrc();
            assert.ok(s.includes("typeof tabId === 'number'"),
                'should validate tabId type');
        });

        it('should default frameId to 0 for main frame', async () => {
            const s = await getSrc();
            assert.ok(s.includes('sender?.frameId ?? 0'),
                'should default frameId to 0');
        });

        it('should use USER origin for injected CSS', async () => {
            const s = await getSrc();
            assert.ok(s.includes("origin: 'USER'"),
                'should set CSS origin to USER');
        });

        it('should catch and log CSS insertion errors', async () => {
            const s = await getSrc();
            assert.ok(s.includes('catch (error)'),
                'should have try-catch for insertCSS');
        });
    });

    describe('onMessage handler', () => {
        it('should handle unknown messages gracefully', async () => {
            const s = await getSrc();
            // After our fix, should not throw for unknown message types
            assert.ok(!s.includes('throw new Error'),
                'should not throw for unknown messages');
        });

        it('should catch promise rejections from message handlers', async () => {
            const s = await getSrc();
            assert.ok(s.includes('.catch('),
                'should have catch handler for message handler promises');
        });

        it('should return false for messages without a what property', async () => {
            const s = await getSrc();
            assert.ok(s.includes('what == undefined'),
                'should check for missing what property');
        });
    });

    describe('initialization', () => {
        it('should register onInstalled handler early', async () => {
            const s = await getSrc();
            const startFn = s.slice(s.indexOf('async function start'));
            const installedIdx = startFn.indexOf('onInstalled');
            const initIdx = startFn.indexOf('initRulesetConfig');
            assert.ok(installedIdx < initIdx,
                'onInstalled should be registered before initRulesetConfig');
        });

        it('should await initRulesetConfig', async () => {
            const s = await getSrc();
            assert.ok(s.includes('await filters.initRulesetConfig()'),
                'should await initRulesetConfig');
        });
    });
});

describe('filters.js', () => {
    let src;
    async function getSrc() {
        if (!src) { src = await fs.readFile(filtersPath, 'utf8'); }
        return src;
    }

    it('should not contain uBO references', async () => {
        const s = await getSrc();
        assert.ok(!s.includes('uBlock Origin Lite'));
        assert.ok(!s.includes('uBOLite'));
    });

    describe('exported functions', () => {
        const namedExports = [
            'initRulesetConfig',
            'isExempt',
            'getExceptions',
            'addException',
            'removeException',
            'updateExceptionsFromString',
            'getFilterlistDetails',
            'enableFilterlist',
            'disableFilterlist',
            'getConfiguration',
        ];

        for (const name of namedExports) {
            it(`should export ${name}`, async () => {
                const s = await getSrc();
                assert.match(s, new RegExp(`export\\s+(async\\s+)?function\\s+${name}\\b`),
                    `should export ${name}`);
            });
        }

        it('should expose filtersMessageHandler via default export', async () => {
            const s = await getSrc();
            assert.ok(s.includes('filtersMessageHandler'),
                'should define filtersMessageHandler');
            assert.ok(s.includes('export default'),
                'should have a default export');
        });
    });

    describe('async correctness', () => {
        it('should await enableRulesets in initRulesetConfig', async () => {
            const s = await getSrc();
            assert.ok(s.includes('await enableRulesets'),
                'enableRulesets should be awaited');
        });

        it('saveRulesetConfig should await localWrite', async () => {
            const s = await getSrc();
            const fn = s.slice(
                s.indexOf('async function saveRulesetConfig'),
                s.indexOf('export async function initRulesetConfig')
            );
            assert.ok(fn.includes('return localWrite'),
                'saveRulesetConfig should return/await localWrite');
        });
    });
});

describe('reportAd.js', () => {
    let src;
    async function getSrc() {
        if (!src) { src = await fs.readFile(reportAdPath, 'utf8'); }
        return src;
    }

    it('should not contain uBO references', async () => {
        const s = await getSrc();
        assert.ok(!s.includes('uBlock Origin Lite'));
        assert.ok(!s.includes('uBOLite'));
    });

    it('should export getLocalAdReportIds', async () => {
        const s = await getSrc();
        assert.match(s, /export\s+(async\s+)?function\s+getLocalAdReportIds/);
    });

    it('should export clearLocalAdReportIds', async () => {
        const s = await getSrc();
        assert.match(s, /export\s+(async\s+)?function\s+clearLocalAdReportIds/);
    });
});
