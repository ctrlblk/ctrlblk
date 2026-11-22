// Checks that every scriptlet the default list uses on YouTube exists, so the
// build doesn't drop any of YouTube's scriptlet filters.
// Run with: node --test tests/build/youtube-scriptlets.test.js

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

import { builtinScriptlets } from '../../src/scriptlets/index.js';
import { resolveScriptletName, scriptletAliases } from '../../build/scriptlet-names.js';

const require = createRequire(import.meta.url);
const defaultList = require.resolve('@ctrlblk/ctrlblk-filters/dist/default.txt');

// The hostnames of the desktop site. m.youtube.com is left out.
const YOUTUBE_HOSTNAMES = new Set(['youtube.com', 'www.youtube.com']);

// The scriptlet tokens of the `##+js(...)` filters in `text` that apply to
// one of YOUTUBE_HOSTNAMES, with the line number of each.
function youtubeScriptletTokens(text) {
    const out = [];
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('!')) continue;
        const match = /^([^#]*)##\+js\(([^,)]*)/.exec(line);
        if (match === null) continue;
        const hostnames = match[1].split(',').map(h => h.trim());
        if (!hostnames.some(h => YOUTUBE_HOSTNAMES.has(h))) continue;
        out.push({ token: match[2].trim(), line: i + 1 });
    }
    return out;
}

describe('YouTube scriptlet filters in the default list', () => {
    it('only use scriptlets the extension has', async () => {
        const text = await readFile(defaultList, 'utf8');
        const tokens = youtubeScriptletTokens(text);
        assert.ok(tokens.length > 0, 'expected YouTube scriptlet filters in default.txt');

        const names = new Set(builtinScriptlets.map(s => s.name));
        const aliases = scriptletAliases(builtinScriptlets);
        const missing = new Map();
        for (const { token, line } of tokens) {
            const name = resolveScriptletName(token, aliases);
            if (names.has(name)) continue;
            if (!missing.has(token)) missing.set(token, []);
            missing.get(token).push(line);
        }
        const report = Array.from(missing, ([token, lines]) =>
            `${token} (lines ${lines.join(', ')})`);
        assert.deepEqual(report, [], `unknown scriptlets: ${report.join('; ')}`);
    });

    it('leave out negated hostnames', () => {
        const tokens = youtubeScriptletTokens([
            '*,~youtube.com##+js(nope)',
            'm.youtube.com##+js(nope)',
            '! www.youtube.com##+js(nope)',
            'example.com,www.youtube.com##+js(set, a, 1)',
        ].join('\n'));
        assert.deepEqual(tokens, [{ token: 'set', line: 4 }]);
    });
});
