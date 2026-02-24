// Unit tests for src/js/lib/fetch-json.js
// Run with: node --test tests/lib/fetch-json.test.js

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const srcPath = new URL('../../src/js/lib/fetch-json.js', import.meta.url);

describe('fetch-json.js', () => {
    let src;
    async function getSrc() {
        if (!src) { src = await fs.readFile(srcPath, 'utf8'); }
        return src;
    }

    it('should export fetchJSON as a named export', async () => {
        const s = await getSrc();
        assert.match(s, /export\s+function\s+fetchJSON/,
            'should export fetchJSON as a function');
    });

    it('should append .json extension to the path', async () => {
        const s = await getSrc();
        assert.ok(s.includes('`${path}.json`'),
            'should append .json to the provided path');
    });

    it('should call response.json() to parse the response', async () => {
        const s = await getSrc();
        assert.ok(s.includes('response.json()'),
            'should parse response as JSON');
    });

    it('should catch and log errors instead of throwing', async () => {
        const s = await getSrc();
        assert.ok(s.includes('.catch('), 'should have a catch handler');
        assert.ok(s.includes('console.info'), 'should log errors with console.info');
    });

    it('should not contain uBO references', async () => {
        const s = await getSrc();
        assert.ok(!s.includes('uBlock Origin Lite'));
        assert.ok(!s.includes('uBOLite'));
    });
});
