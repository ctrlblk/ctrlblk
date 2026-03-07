// CSS template tests for ctrlblk scriptlet system.
// Run with: node --test tests/scriptlets/css-templates.test.js

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const TEMPLATE_DIR = 'src/scriptlets/templates';

const cssTemplates = [
    { file: 'css-generic.template.js', iife: 'ctrlblk_cssGenericImport', global: 'genericSelectorMap' },
    { file: 'css-specific.template.js', iife: 'ctrlblk_cssSpecificImports', global: 'specificImports' },
    { file: 'css-declarative.template.js', iife: 'ctrlblk_cssDeclarativeImport', global: 'declarativeImports' },
    { file: 'css-procedural.template.js', iife: 'ctrlblk_cssProceduralImport', global: 'proceduralImports' },
];

for (const { file, iife, global: globalName } of cssTemplates) {
    describe(`CSS template: ${file}`, () => {
        it(`should have IIFE named ${iife}`, async () => {
            const src = await readFile(`${TEMPLATE_DIR}/${file}`, 'utf8');
            assert.ok(src.includes(`function ${iife}(`),
                `Should contain IIFE named ${iife}`);
        });

        it('should not contain uBOL_ references', async () => {
            const src = await readFile(`${TEMPLATE_DIR}/${file}`, 'utf8');
            assert.ok(!src.includes('uBOL_'),
                `${file} should not contain uBOL_`);
        });

        it(`should set self.${globalName}`, async () => {
            const src = await readFile(`${TEMPLATE_DIR}/${file}`, 'utf8');
            assert.ok(src.includes(`self.${globalName}`),
                `Should reference self.${globalName}`);
        });

        it('should produce valid JS after placeholder fill', async () => {
            const src = await readFile(`${TEMPLATE_DIR}/${file}`, 'utf8');
            const filled = src
                .replace(/\$rulesetId\$/g, 'test')
                .replace(/self\.\$genericSelectorMap\$/g, '[]')
                .replace(/self\.\$argsList\$/g, '[]')
                .replace(/self\.\$hostnamesMap\$/g, '[]')
                .replace(/self\.\$entitiesMap\$/g, '[]')
                .replace(/self\.\$exceptionsMap\$/g, '[]');
            assert.doesNotThrow(() => {
                new Function(filled);
            }, `Filled ${file} should be syntactically valid JS`);
        });

        it('should have ctrlblk copyright header', async () => {
            const src = await readFile(`${TEMPLATE_DIR}/${file}`, 'utf8');
            assert.ok(src.includes('CtrlBlk'),
                `${file} should have CtrlBlk in header`);
            assert.ok(!src.includes('uBlock Origin Lite - a comprehensive'),
                `${file} should not have uBO copyright header`);
        });
    });
}
