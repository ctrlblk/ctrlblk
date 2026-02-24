// Unit tests for src/js/lib/hostname-utils.js
// Run with: node --test tests/lib/hostname-utils.test.js
//
// These are pure functions so we test them directly by evaluating the
// module source in a controlled context (no browser APIs needed except
// for broadcastMessage and log which we skip in unit tests).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';

// Load the source and evaluate it in a sandbox that stubs browser imports.
async function loadModule() {
    const src = await fs.readFile(
        new URL('../../src/js/lib/hostname-utils.js', import.meta.url),
        'utf8'
    );
    // Strip import statements and export keywords so we can eval in a vm
    const stripped = src
        .replace(/^import\s.*?;\s*/gms, '')
        .replace(/^export\s+(const|function|class|let|var)\s/gm, '$1 ')
        .replace(/^export\s*\{[^}]*\}\s*;?\s*/gm, '');
    const context = vm.createContext({
        self: { BroadcastChannel: class { postMessage() {} } },
        console: { info: () => {} },
        URL, Set, Array, Map,
        browser: { runtime: { id: 'test-id' } },
    });
    // Wrap in a function that returns the exports
    const wrapped = `(function() {
        ${stripped}
        return {
            parsedURLromOrigin,
            toBroaderHostname,
            isDescendantHostname,
            isDescendantHostnameOfIter,
            intersectHostnameIters,
            subtractHostnameIters,
            matchesFromHostnames,
            hostnamesFromMatches,
            broadcastMessage,
            log,
        };
    })()`;
    return vm.runInContext(wrapped, context);
}

// Helper for cross-vm-context array comparison
const assertArrayEqual = (actual, expected) => {
    assert.equal(JSON.stringify(actual), JSON.stringify(expected));
};

describe('hostname-utils.js', () => {
    let mod;

    it('module loads without error', async () => {
        mod = await loadModule();
        assert.ok(mod);
    });

    describe('toBroaderHostname', () => {
        it('strips leftmost label', async () => {
            if (!mod) mod = await loadModule();
            assert.equal(mod.toBroaderHostname('sub.example.com'), 'example.com');
        });
        it('returns * for a TLD', async () => {
            if (!mod) mod = await loadModule();
            assert.equal(mod.toBroaderHostname('com'), '*');
        });
        it('returns empty string for *', async () => {
            if (!mod) mod = await loadModule();
            assert.equal(mod.toBroaderHostname('*'), '');
        });
        it('handles deep hostnames', async () => {
            if (!mod) mod = await loadModule();
            assert.equal(mod.toBroaderHostname('a.b.c.d.com'), 'b.c.d.com');
        });
    });

    describe('isDescendantHostname', () => {
        it('returns true for subdomain', async () => {
            if (!mod) mod = await loadModule();
            assert.ok(mod.isDescendantHostname('sub.example.com', 'example.com'));
        });
        it('returns false for same hostname', async () => {
            if (!mod) mod = await loadModule();
            assert.ok(!mod.isDescendantHostname('example.com', 'example.com'));
        });
        it('returns false for unrelated', async () => {
            if (!mod) mod = await loadModule();
            assert.ok(!mod.isDescendantHostname('other.com', 'example.com'));
        });
        it('returns true for all-urls', async () => {
            if (!mod) mod = await loadModule();
            assert.ok(mod.isDescendantHostname('example.com', 'all-urls'));
        });
        it('rejects partial suffix match', async () => {
            if (!mod) mod = await loadModule();
            // "notexample.com" ends with "example.com" but is not a subdomain
            assert.ok(!mod.isDescendantHostname('notexample.com', 'example.com'));
        });
    });

    describe('isDescendantHostnameOfIter', () => {
        it('matches against set', async () => {
            if (!mod) mod = await loadModule();
            const set = new Set(['example.com', 'other.org']);
            assert.ok(mod.isDescendantHostnameOfIter('sub.example.com', set));
        });
        it('no match returns false', async () => {
            if (!mod) mod = await loadModule();
            const set = new Set(['example.com']);
            assert.ok(!mod.isDescendantHostnameOfIter('other.org', set));
        });
        it('all-urls matches everything', async () => {
            if (!mod) mod = await loadModule();
            const set = new Set(['all-urls']);
            assert.ok(mod.isDescendantHostnameOfIter('anything.com', set));
        });
        it('* matches everything', async () => {
            if (!mod) mod = await loadModule();
            const set = new Set(['*']);
            assert.ok(mod.isDescendantHostnameOfIter('anything.com', set));
        });
        it('works with arrays', async () => {
            if (!mod) mod = await loadModule();
            assert.ok(mod.isDescendantHostnameOfIter('sub.example.com', ['example.com']));
        });
    });

    describe('intersectHostnameIters', () => {
        it('returns matching hostnames', async () => {
            if (!mod) mod = await loadModule();
            const result = mod.intersectHostnameIters(
                ['sub.example.com', 'other.org'],
                new Set(['example.com'])
            );
            assertArrayEqual(result, ['sub.example.com']);
        });
        it('returns all for all-urls', async () => {
            if (!mod) mod = await loadModule();
            const result = mod.intersectHostnameIters(
                ['a.com', 'b.com'],
                new Set(['all-urls'])
            );
            assertArrayEqual(result, ['a.com', 'b.com']);
        });
        it('includes exact matches', async () => {
            if (!mod) mod = await loadModule();
            const result = mod.intersectHostnameIters(
                ['example.com'],
                new Set(['example.com'])
            );
            assertArrayEqual(result, ['example.com']);
        });
    });

    describe('subtractHostnameIters', () => {
        it('removes matching hostnames', async () => {
            if (!mod) mod = await loadModule();
            const result = mod.subtractHostnameIters(
                ['sub.example.com', 'other.org'],
                new Set(['example.com'])
            );
            assertArrayEqual(result, ['other.org']);
        });
        it('returns empty for all-urls', async () => {
            if (!mod) mod = await loadModule();
            const result = mod.subtractHostnameIters(
                ['a.com', 'b.com'],
                new Set(['all-urls'])
            );
            assertArrayEqual(result, []);
        });
        it('removes exact matches', async () => {
            if (!mod) mod = await loadModule();
            const result = mod.subtractHostnameIters(
                ['example.com', 'other.org'],
                new Set(['example.com'])
            );
            assertArrayEqual(result, ['other.org']);
        });
    });

    describe('matchesFromHostnames', () => {
        it('converts to match patterns', async () => {
            if (!mod) mod = await loadModule();
            assertArrayEqual(
                mod.matchesFromHostnames(['example.com']),
                ['*://*.example.com/*']
            );
        });
        it('* becomes <all_urls>', async () => {
            if (!mod) mod = await loadModule();
            assertArrayEqual(
                mod.matchesFromHostnames(['*']),
                ['<all_urls>']
            );
        });
        it('all-urls becomes <all_urls>', async () => {
            if (!mod) mod = await loadModule();
            assertArrayEqual(
                mod.matchesFromHostnames(['all-urls']),
                ['<all_urls>']
            );
        });
        it('<all_urls> replaces all previous entries', async () => {
            if (!mod) mod = await loadModule();
            assertArrayEqual(
                mod.matchesFromHostnames(['a.com', '*', 'b.com']),
                ['<all_urls>']
            );
        });
    });

    describe('hostnamesFromMatches', () => {
        it('converts match patterns to hostnames', async () => {
            if (!mod) mod = await loadModule();
            assertArrayEqual(
                mod.hostnamesFromMatches(['*://*.example.com/*']),
                ['example.com']
            );
        });
        it('converts <all_urls> to all-urls', async () => {
            if (!mod) mod = await loadModule();
            assertArrayEqual(
                mod.hostnamesFromMatches(['<all_urls>']),
                ['all-urls']
            );
        });
    });

    describe('parsedURLromOrigin', () => {
        it('parses valid URL', async () => {
            if (!mod) mod = await loadModule();
            const url = mod.parsedURLromOrigin('https://example.com');
            assert.equal(url.hostname, 'example.com');
        });
        it('returns undefined for invalid', async () => {
            if (!mod) mod = await loadModule();
            assert.equal(mod.parsedURLromOrigin('not a url'), undefined);
        });
    });

    describe('no uBO remnants', () => {
        it('should not contain uBO copyright headers', async () => {
            const src = await fs.readFile(
                new URL('../../src/js/lib/hostname-utils.js', import.meta.url),
                'utf8'
            );
            assert.ok(!src.includes('uBlock Origin Lite'));
        });
        it('should use ctrlblk broadcast channel name', async () => {
            const src = await fs.readFile(
                new URL('../../src/js/lib/hostname-utils.js', import.meta.url),
                'utf8'
            );
            assert.ok(!src.includes("'uBOL'"), 'should not use uBOL channel name');
            assert.ok(src.includes("'ctrlblk'"), 'should use ctrlblk channel name');
        });
    });
});
