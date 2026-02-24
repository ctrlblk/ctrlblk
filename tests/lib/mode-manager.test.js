// Unit tests for src/js/lib/mode-manager.js
// Run with: node --test tests/lib/mode-manager.test.js

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const srcPath = new URL('../../src/js/lib/mode-manager.js', import.meta.url);

describe('mode-manager.js', () => {
    let src;
    async function getSrc() {
        if (!src) { src = await fs.readFile(srcPath, 'utf8'); }
        return src;
    }

    it('should not contain uBO references', async () => {
        const s = await getSrc();
        assert.ok(!s.includes('uBlock Origin Lite'));
        assert.ok(!s.includes('uBOLite'));
    });

    describe('MODE constants', () => {
        it('should export MODE_NONE = 0', async () => {
            const s = await getSrc();
            assert.match(s, /export\s+const\s+MODE_NONE\s*=\s*0/);
        });

        it('should export MODE_BASIC = 1', async () => {
            const s = await getSrc();
            assert.match(s, /export\s+const\s+MODE_BASIC\s*=\s*1/);
        });

        it('should export MODE_OPTIMAL = 2', async () => {
            const s = await getSrc();
            assert.match(s, /export\s+const\s+MODE_OPTIMAL\s*=\s*2/);
        });

        it('should export MODE_COMPLETE = 3', async () => {
            const s = await getSrc();
            assert.match(s, /export\s+const\s+MODE_COMPLETE\s*=\s*3/);
        });
    });

    describe('exported functions', () => {
        const expectedFunctions = [
            'getFilteringModeDetails',
            'setFilteringMode',
            'getDefaultFilteringMode',
            'setDefaultFilteringMode',
            'getTrustedSites',
            'setTrustedSites',
            'syncWithBrowserPermissions',
        ];

        for (const name of expectedFunctions) {
            it(`should export ${name}`, async () => {
                const s = await getSrc();
                // Each function is individually exported with "export async function" or "export function"
                assert.match(s, new RegExp(`export\\s+(async\\s+)?function\\s+${name}\\b`),
                    `should export ${name}`);
            });
        }
    });

    describe('module dependencies', () => {
        it('should import from lib modules, not uBOLite', async () => {
            const s = await getSrc();
            assert.ok(s.includes('./browser-api.js'), 'should import from browser-api.js');
            assert.ok(s.includes('./hostname-utils.js'), 'should import from hostname-utils.js');
            assert.ok(s.includes('./ruleset-manager.js'), 'should import from ruleset-manager.js');
        });
    });

    describe('backward compat deserialization', () => {
        it('should handle legacy field names from older storage formats', async () => {
            const s = await getSrc();
            // The unserializeModeDetails function must handle these legacy keys
            assert.ok(s.includes('network'), 'should handle legacy "network" field');
            assert.ok(s.includes('extendedSpecific'), 'should handle legacy "extendedSpecific" field');
            assert.ok(s.includes('extendedGeneric'), 'should handle legacy "extendedGeneric" field');
        });
    });

    describe('async correctness', () => {
        it('filteringModesToDNR should be awaited in readFilteringModeDetails', async () => {
            const s = await getSrc();
            assert.ok(s.includes('await filteringModesToDNR'),
                'filteringModesToDNR should be awaited');
        });

        it('storage writes should be awaited in writeFilteringModeDetails', async () => {
            const s = await getSrc();
            const writeFn = s.slice(
                s.indexOf('async function writeFilteringModeDetails'),
                s.indexOf('async function filteringModesToDNR')
            );
            assert.ok(writeFn.includes('await localWrite'), 'localWrite should be awaited');
            assert.ok(writeFn.includes('await sessionWrite'), 'sessionWrite should be awaited');
        });
    });
});
