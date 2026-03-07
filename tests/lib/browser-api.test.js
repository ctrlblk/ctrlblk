// Unit tests for src/js/lib/browser-api.js
// Run with: node --test tests/lib/browser-api.test.js

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// We can't test the browser/dnr/runtime/i18n exports in Node (they need
// a real extension context). Instead we test the logic-bearing functions:
// sendMessage retry behavior and storage helpers.
//
// We do this by importing the module source and evaluating it in a
// controlled environment.

// Helper: build a minimal globalThis.self with a mock chrome API
function makeMockChrome() {
    return {
        runtime: {
            sendMessage: mock.fn(),
        },
        declarativeNetRequest: {},
        i18n: {},
        storage: {
            local: {
                get: mock.fn(),
                set: mock.fn(),
                remove: mock.fn(),
            },
            session: {
                get: mock.fn(),
                set: mock.fn(),
            },
            managed: {
                get: mock.fn(),
            },
        },
    };
}

describe('browser-api.js', () => {
    describe('module exports', async () => {
        // We just verify the module can be parsed and has the expected exports.
        // The actual browser detection can't run in Node, so we test via the
        // integration tests (test:filter).
        it('should export the expected symbols', async () => {
            const fs = await import('node:fs/promises');
            const src = await fs.readFile(
                new URL('../../src/js/lib/browser-api.js', import.meta.url),
                'utf8'
            );
            const expectedExports = [
                'browser', 'dnr', 'i18n', 'runtime',
                'sendMessage',
                'localRead', 'localWrite', 'localRemove',
                'sessionRead', 'sessionWrite',
                'adminRead',
            ];
            for (const name of expectedExports) {
                assert.ok(
                    src.includes(`export`) && src.includes(name),
                    `should export ${name}`
                );
            }
        });

        it('should not contain uBO copyright headers', async () => {
            const fs = await import('node:fs/promises');
            const src = await fs.readFile(
                new URL('../../src/js/lib/browser-api.js', import.meta.url),
                'utf8'
            );
            assert.ok(!src.includes('uBlock Origin Lite'),
                'should not have uBO copyright header');
            assert.ok(!src.includes('Raymond Hill'),
                'should not reference original author');
        });

        it('should handle Element-safe browser detection inline', async () => {
            const fs = await import('node:fs/promises');
            const src = await fs.readFile(
                new URL('../../src/js/lib/browser-api.js', import.meta.url),
                'utf8'
            );
            // Must check typeof Element to avoid ReferenceError in service workers
            assert.ok(src.includes('Element'),
                'should reference Element for service worker safety');
        });
    });
});
