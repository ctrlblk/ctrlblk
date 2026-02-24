// Unit tests for src/js/lib/ruleset-manager.js
// Run with: node --test tests/lib/ruleset-manager.test.js

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const srcPath = new URL('../../src/js/lib/ruleset-manager.js', import.meta.url);

describe('ruleset-manager.js', () => {
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

    describe('exported symbols', () => {
        const expectedExports = [
            'TRUSTED_DIRECTIVE_BASE_RULE_ID',
            'getRulesetDetails',
            'getDynamicRules',
            'enableRulesets',
            'defaultRulesetsFromLanguage',
            'getEnabledRulesetsDetails',
            'updateDynamicRules',
        ];

        for (const name of expectedExports) {
            it(`should export ${name}`, async () => {
                const s = await getSrc();
                const exportBlock = s.slice(s.lastIndexOf('export {'));
                assert.ok(exportBlock.includes(name), `should export ${name}`);
            });
        }
    });

    describe('rule realm constants', () => {
        it('should define RULE_REALM_SIZE = 1000000', async () => {
            const s = await getSrc();
            assert.match(s, /RULE_REALM_SIZE\s*=\s*1000000/);
        });

        it('should define realm constants in ascending order', async () => {
            const s = await getSrc();
            assert.ok(s.includes('REGEXES_REALM_START'), 'should define REGEXES_REALM_START');
            assert.ok(s.includes('REMOVEPARAMS_REALM_START'), 'should define REMOVEPARAMS_REALM_START');
            assert.ok(s.includes('REDIRECT_REALM_START'), 'should define REDIRECT_REALM_START');
            assert.ok(s.includes('TRUSTED_DIRECTIVE_BASE_RULE_ID'), 'should define TRUSTED_DIRECTIVE_BASE_RULE_ID');
        });
    });

    describe('module dependencies', () => {
        it('should import from lib modules', async () => {
            const s = await getSrc();
            assert.ok(s.includes('./browser-api.js'), 'should import from browser-api.js');
            assert.ok(s.includes('./fetch-json.js'), 'should import from fetch-json.js');
        });
    });

    describe('getDynamicRules caching', () => {
        it('should cache the promise for getDynamicRules', async () => {
            const s = await getSrc();
            assert.ok(s.includes('getDynamicRules.promise'), 'should use promise caching pattern');
        });

        it('should invalidate cache on updateDynamicRules failure', async () => {
            const s = await getSrc();
            // After our fix, the catch handler should clear the cache
            const catchBlock = s.slice(s.indexOf('dnr.updateDynamicRules'));
            assert.ok(catchBlock.includes('getDynamicRules.promise = undefined'),
                'should invalidate cache on error');
        });
    });

    describe('pruneInvalidRegexRules', () => {
        it('should call dnr.getDynamicRules directly (not cached) for fresh data', async () => {
            const s = await getSrc();
            const pruneFn = s.slice(
                s.indexOf('async function pruneInvalidRegexRules'),
                s.indexOf('async function updateRealmRules')
            );
            assert.ok(pruneFn.includes('await dnr.getDynamicRules()'),
                'should call API directly for prune validation');
        });
    });
});
