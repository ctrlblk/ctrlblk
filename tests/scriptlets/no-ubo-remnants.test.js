// Scan all files in src/scriptlets/ for uBO naming remnants.
// Run with: node --test tests/scriptlets/no-ubo-remnants.test.js

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { globSync } from 'node:fs';
import { resolve } from 'node:path';

// Use dynamic import of glob for Node < 22 compatibility
async function getFiles(pattern) {
    const { glob } = await import('node:fs');
    // Fallback: use a simpler approach with readdirSync
    const { readdirSync, statSync } = await import('node:fs');
    const { join } = await import('node:path');

    const results = [];
    function walk(dir) {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const full = join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(full);
            } else if (entry.name.endsWith('.js') || entry.name.endsWith('.css')) {
                results.push(full);
            }
        }
    }
    walk('src/scriptlets');
    return results;
}

describe('No uBO naming remnants in src/scriptlets/', () => {
    let files;

    it('should find scriptlet source files', async () => {
        files = await getFiles();
        assert.ok(files.length > 0, 'Should find source files');
    });

    it('should have no uBOL_ references in any file', async () => {
        if (!files) files = await getFiles();
        const violations = [];
        for (const file of files) {
            const content = await readFile(file, 'utf8');
            if (content.includes('uBOL_')) {
                violations.push(file);
            }
        }
        assert.equal(violations.length, 0,
            `Files with uBOL_ references: ${violations.join(', ')}`);
    });

    it('should have no uboLog references in any file', async () => {
        if (!files) files = await getFiles();
        const violations = [];
        for (const file of files) {
            const content = await readFile(file, 'utf8');
            if (content.includes('uboLog')) {
                violations.push(file);
            }
        }
        assert.equal(violations.length, 0,
            `Files with uboLog references: ${violations.join(', ')}`);
    });

    it('should have no uboErr references in any file', async () => {
        if (!files) files = await getFiles();
        const violations = [];
        for (const file of files) {
            const content = await readFile(file, 'utf8');
            if (content.includes('uboErr')) {
                violations.push(file);
            }
        }
        assert.equal(violations.length, 0,
            `Files with uboErr references: ${violations.join(', ')}`);
    });

    it('should have no old uBO copyright header in template files', async () => {
        if (!files) files = await getFiles();
        const templates = files.filter(f => f.includes('template'));
        const violations = [];
        for (const file of templates) {
            const content = await readFile(file, 'utf8');
            if (content.includes('uBlock Origin Lite - a comprehensive')) {
                violations.push(file);
            }
        }
        assert.equal(violations.length, 0,
            `Templates with old copyright: ${violations.join(', ')}`);
    });
});

describe('No uBO naming remnants in src/js/scripting/', () => {
    it('should have no uBOL_ function names', async () => {
        const { readdirSync } = await import('node:fs');
        const files = readdirSync('src/js/scripting').filter(f => f.endsWith('.js'));
        const violations = [];
        for (const file of files) {
            const content = await readFile(`src/js/scripting/${file}`, 'utf8');
            if (content.includes('uBOL_')) {
                violations.push(file);
            }
        }
        assert.equal(violations.length, 0,
            `Runtime files with uBOL_ references: ${violations.join(', ')}`);
    });

    it('should have no [uBOL] log prefixes', async () => {
        const { readdirSync } = await import('node:fs');
        const files = readdirSync('src/js/scripting').filter(f => f.endsWith('.js'));
        const violations = [];
        for (const file of files) {
            const content = await readFile(`src/js/scripting/${file}`, 'utf8');
            if (content.includes('[uBOL]')) {
                violations.push(file);
            }
        }
        assert.equal(violations.length, 0,
            `Runtime files with [uBOL] prefix: ${violations.join(', ')}`);
    });
});
