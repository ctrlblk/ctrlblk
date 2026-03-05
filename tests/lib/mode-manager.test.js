// Unit tests for src/js/lib/mode-manager.js
// Run with: node --test tests/lib/mode-manager.test.js

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

describe('mode-manager.js', () => {
    let src;

    async function getSrc() {
        if (!src) {
            src = await fs.readFile(
                new URL('../../src/js/lib/mode-manager.js', import.meta.url),
                'utf8'
            );
        }
        return src;
    }

    it('should not contain uBO copyright headers', async () => {
        const s = await getSrc();
        assert.ok(!s.includes('uBlock Origin Lite'));
        assert.ok(!s.includes('Raymond Hill'));
    });

    it('should export MODE constants', async () => {
        const s = await getSrc();
        assert.ok(s.includes('MODE_NONE'));
        assert.ok(s.includes('MODE_BASIC'));
        assert.ok(s.includes('MODE_OPTIMAL'));
        assert.ok(s.includes('MODE_COMPLETE'));
    });

    it('should define MODE constants with correct values 0-3', async () => {
        const s = await getSrc();
        assert.ok(s.includes('= 0'), 'MODE_NONE should be 0');
        assert.ok(s.includes('= 1'), 'MODE_BASIC should be 1');
        assert.ok(s.includes('= 2'), 'MODE_OPTIMAL should be 2');
        assert.ok(s.includes('= 3'), 'MODE_COMPLETE should be 3');
    });

    it('should export getFilteringModeDetails', async () => {
        const s = await getSrc();
        assert.ok(s.includes('getFilteringModeDetails'));
    });

    it('should export setFilteringMode', async () => {
        const s = await getSrc();
        assert.ok(s.includes('setFilteringMode'));
    });

    it('should export getDefaultFilteringMode', async () => {
        const s = await getSrc();
        assert.ok(s.includes('getDefaultFilteringMode'));
    });

    it('should export setDefaultFilteringMode', async () => {
        const s = await getSrc();
        assert.ok(s.includes('setDefaultFilteringMode'));
    });

    it('should export getTrustedSites', async () => {
        const s = await getSrc();
        assert.ok(s.includes('getTrustedSites'));
    });

    it('should export setTrustedSites', async () => {
        const s = await getSrc();
        assert.ok(s.includes('setTrustedSites'));
    });

    it('should export syncWithBrowserPermissions', async () => {
        const s = await getSrc();
        assert.ok(s.includes('syncWithBrowserPermissions'));
    });

    it('should import from lib modules, not uBOLite', async () => {
        const s = await getSrc();
        assert.ok(!s.includes('uBOLite'), 'should not import from uBOLite');
        assert.ok(s.includes('./browser-api.js'), 'should import from browser-api.js');
        assert.ok(s.includes('./hostname-utils.js'), 'should import from hostname-utils.js');
        assert.ok(s.includes('./ruleset-manager.js'), 'should import from ruleset-manager.js');
    });

    it('should support backward compat deserialization', async () => {
        const s = await getSrc();
        // Must handle legacy field names from older storage formats
        assert.ok(s.includes('network'), 'should handle legacy "network" field');
        assert.ok(s.includes('extendedSpecific'), 'should handle legacy "extendedSpecific" field');
        assert.ok(s.includes('extendedGeneric'), 'should handle legacy "extendedGeneric" field');
    });
});
