// Unit tests for src/js/lib/ruleset-manager.js
// Run with: node --test tests/lib/ruleset-manager.test.js

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

describe('ruleset-manager.js', () => {
    let src;

    async function getSrc() {
        if (!src) {
            src = await fs.readFile(
                new URL('../../src/js/lib/ruleset-manager.js', import.meta.url),
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

    it('should export TRUSTED_DIRECTIVE_BASE_RULE_ID', async () => {
        const s = await getSrc();
        assert.ok(s.includes('TRUSTED_DIRECTIVE_BASE_RULE_ID'));
    });

    it('should export getRulesetDetails', async () => {
        const s = await getSrc();
        assert.ok(s.includes('getRulesetDetails'));
    });

    it('should export getDynamicRules', async () => {
        const s = await getSrc();
        assert.ok(s.includes('getDynamicRules'));
    });

    it('should export enableRulesets', async () => {
        const s = await getSrc();
        assert.ok(s.includes('enableRulesets'));
    });

    it('should export defaultRulesetsFromLanguage', async () => {
        const s = await getSrc();
        assert.ok(s.includes('defaultRulesetsFromLanguage'));
    });

    it('should export getEnabledRulesetsDetails', async () => {
        const s = await getSrc();
        assert.ok(s.includes('getEnabledRulesetsDetails'));
    });

    it('should export updateDynamicRules', async () => {
        const s = await getSrc();
        assert.ok(s.includes('updateDynamicRules'));
    });

    it('should define correct rule realm constants', async () => {
        const s = await getSrc();
        assert.ok(s.includes('1000000'), 'should have REGEXES_REALM_START at 1M');
        assert.ok(s.includes('8000000'), 'should have TRUSTED_DIRECTIVE_BASE_RULE_ID at 8M');
    });

    it('should import from lib modules, not uBOLite', async () => {
        const s = await getSrc();
        assert.ok(!s.includes('uBOLite'), 'should not import from uBOLite');
        assert.ok(s.includes('./browser-api.js'), 'should import from browser-api.js');
        assert.ok(s.includes('./fetch-json.js'), 'should import from fetch-json.js');
    });
});
