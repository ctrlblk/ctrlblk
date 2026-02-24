// Template generation tests for ctrlblk scriptlet system.
// Run with: node --test tests/scriptlets/template.test.js

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const TEMPLATE_DIR = 'src/scriptlets/templates';

describe('Scriptlet template: ctrlblk_ prefix', () => {
    it('should use ctrlblk_ prefix, not uBOL_', async () => {
        const src = await readFile(`${TEMPLATE_DIR}/scriptlet.template.js`, 'utf8');
        assert.ok(src.includes('ctrlblk_$scriptletName$'),
            'Template should contain ctrlblk_$scriptletName$');
        assert.ok(!src.includes('uBOL_$scriptletName$'),
            'Template should not contain uBOL_$scriptletName$');
    });

    it('should have no uBOL_ references at all', async () => {
        const src = await readFile(`${TEMPLATE_DIR}/scriptlet.template.js`, 'utf8');
        assert.ok(!src.includes('uBOL_'),
            'Template should have no uBOL_ references');
    });

    it('should produce syntactically valid JS after placeholder fill', async () => {
        const src = await readFile(`${TEMPLATE_DIR}/scriptlet.template.js`, 'utf8');
        const filled = src
            .replace(/\$scriptletName\$/g, 'testScriptlet')
            .replace(/\$rulesetId\$/g, 'test-ruleset')
            .replace(/\$world\$/g, 'MAIN')
            .replace(/self\.\$argsList\$/g, '[]')
            .replace(/self\.\$hostnamesMap\$/g, '[]')
            .replace(/self\.\$entitiesMap\$/g, '[]')
            .replace(/self\.\$exceptionsMap\$/g, '[]');
        // Should parse without error
        assert.doesNotThrow(() => {
            new Function(filled);
        }, 'Filled template should be syntactically valid JS');
    });
});
