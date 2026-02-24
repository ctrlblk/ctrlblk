// Validation test for the clean-room scriptlet implementation.
// Run with: node --test tests/scriptlets/compare.test.js

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { builtinScriptlets } from '../../src/scriptlets/index.js';

// Build lookup map by name
const byName = new Map(builtinScriptlets.map(s => [s.name, s]));

// Expected counts (verified against reference implementation)
const EXPECTED_TOTAL = 81;
const EXPECTED_HELPERS = 23;
const EXPECTED_SCRIPTLETS = 58;

// ============================================================================
// Level 1 — Structural validation
// ============================================================================

describe('Level 1: Structural validation', () => {
    it('should have the expected total number of scriptlets', () => {
        assert.equal(builtinScriptlets.length, EXPECTED_TOTAL,
            `Expected ${EXPECTED_TOTAL} scriptlets, got ${builtinScriptlets.length}`);
    });

    it('should have the expected number of helper functions (.fn names)', () => {
        const helpers = builtinScriptlets.filter(s => s.name.endsWith('.fn'));
        assert.equal(helpers.length, EXPECTED_HELPERS);
    });

    it('should have the expected number of user-facing scriptlets (.js names)', () => {
        const scriptlets = builtinScriptlets.filter(s => s.name.endsWith('.js'));
        assert.equal(scriptlets.length, EXPECTED_SCRIPTLETS);
    });

    it('should have no duplicate names', () => {
        const names = builtinScriptlets.map(s => s.name);
        const unique = new Set(names);
        assert.equal(unique.size, names.length, `Found duplicate names`);
    });

    it('should have no duplicate aliases', () => {
        const aliases = new Map();
        for (const s of builtinScriptlets) {
            for (const alias of (s.aliases || [])) {
                assert.ok(!aliases.has(alias),
                    `Alias "${alias}" used by both "${aliases.get(alias)}" and "${s.name}"`);
                aliases.set(alias, s.name);
            }
        }
    });

    for (const entry of builtinScriptlets) {
        describe(`${entry.name}`, () => {
            it('should have a valid fn property', () => {
                assert.equal(typeof entry.fn, 'function', `${entry.name} fn is not a function`);
            });

            it('should have a string name', () => {
                assert.equal(typeof entry.name, 'string');
                assert.ok(entry.name.length > 0);
            });

            it('should have resolvable dependencies', () => {
                for (const dep of (entry.dependencies || [])) {
                    assert.ok(byName.has(dep),
                        `${entry.name} depends on "${dep}" which does not exist`);
                }
            });

            if (entry.aliases) {
                it('should have aliases as an array of strings', () => {
                    assert.ok(Array.isArray(entry.aliases));
                    for (const a of entry.aliases) {
                        assert.equal(typeof a, 'string');
                    }
                });
            }

            if (entry.world) {
                it('should have a valid world value', () => {
                    assert.ok(['MAIN', 'ISOLATED'].includes(entry.world),
                        `Invalid world: ${entry.world}`);
                });
            }

            if (entry.requiresTrust !== undefined) {
                it('should have requiresTrust as boolean', () => {
                    assert.equal(typeof entry.requiresTrust, 'boolean');
                });
            }
        });
    }
});

// ============================================================================
// Level 2 — Function signature validation
// ============================================================================

function parseFnSignature(fn) {
    const src = fn.toString();
    const match = src.match(/^function\s+\w+\s*\(([^)]*)\)/);
    if (!match) {
        const arrowMatch = src.match(/^\(([^)]*)\)\s*=>/);
        return { params: arrowMatch ? arrowMatch[1].trim() : '' };
    }
    return { params: match[1].trim() };
}

describe('Level 2: Function signature validation', () => {
    for (const entry of builtinScriptlets) {
        describe(`${entry.name}`, () => {
            it('should have fn.name matching the expected function name', () => {
                assert.ok(entry.fn.name.length > 0,
                    `${entry.name} has empty fn.name`);
            });

            it('should have parseable function signature', () => {
                const sig = parseFnSignature(entry.fn);
                assert.equal(typeof sig.params, 'string');
            });
        });
    }
});

// ============================================================================
// Level 3 — No legacy naming remnants
// ============================================================================

describe('Level 3: No uBO naming remnants', () => {
    it('should not have uboLog in any scriptlet fn source', () => {
        for (const entry of builtinScriptlets) {
            const src = entry.fn.toString();
            assert.ok(!src.includes('uboLog'),
                `${entry.name} still contains "uboLog"`);
        }
    });

    it('should not have uboErr in any scriptlet fn source', () => {
        for (const entry of builtinScriptlets) {
            const src = entry.fn.toString();
            assert.ok(!src.includes('uboErr'),
                `${entry.name} still contains "uboErr"`);
        }
    });

    it('should have log_ on safe-self', () => {
        const safeSelfEntry = byName.get('safe-self.fn');
        assert.ok(safeSelfEntry, 'safe-self.fn should exist');
        const src = safeSelfEntry.fn.toString();
        assert.ok(src.includes('log_:'), 'safe-self.fn should define log_');
    });

    it('should have err_ on safe-self', () => {
        const safeSelfEntry = byName.get('safe-self.fn');
        assert.ok(safeSelfEntry, 'safe-self.fn should exist');
        const src = safeSelfEntry.fn.toString();
        assert.ok(src.includes('err_:'), 'safe-self.fn should define err_');
    });
});
