// Unit tests for src/js/lib/fetch-json.js
// Run with: node --test tests/lib/fetch-json.test.js

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('fetch-json.js', () => {
    it('should export fetchJSON', async () => {
        const fs = await import('node:fs/promises');
        const src = await fs.readFile(
            new URL('../../src/js/lib/fetch-json.js', import.meta.url),
            'utf8'
        );
        assert.ok(src.includes('export') && src.includes('fetchJSON'),
            'should export fetchJSON');
    });

    it('should not contain uBO copyright headers', async () => {
        const fs = await import('node:fs/promises');
        const src = await fs.readFile(
            new URL('../../src/js/lib/fetch-json.js', import.meta.url),
            'utf8'
        );
        assert.ok(!src.includes('uBlock Origin Lite'),
            'should not have uBO copyright header');
    });

    it('should append .json to the path', async () => {
        const fs = await import('node:fs/promises');
        const src = await fs.readFile(
            new URL('../../src/js/lib/fetch-json.js', import.meta.url),
            'utf8'
        );
        assert.ok(src.includes('.json'),
            'should reference .json extension');
    });
});
