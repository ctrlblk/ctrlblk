// Unit tests for the filter engine.
// Run with: node --test tests/build/engine.test.js

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { processFilterLists } from '../../build/engine.js';

describe('processFilterLists', () => {
    it('should compile the $mp4 option to a media redirect', async () => {
        const result = await processFilterLists([
            { name: 't', text: '||example.com/video$mp4' },
        ]);
        const rule = result.network.ruleset.find(r =>
            r.action?.redirect?.extensionPath === '/web_accessible_resources/noop-1s.mp4'
        );
        assert.ok(rule, 'expected a redirect rule to noop-1s.mp4');
        assert.deepEqual(rule.condition.resourceTypes, ['media']);
    });
});
