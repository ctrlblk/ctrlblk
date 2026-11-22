// Unit tests for src/js/background/adReportCleanup.js
// Run with: node --test tests/lib/ad-report-cleanup.test.js

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { removeAdReportData } from '../../src/js/background/adReportCleanup.js';

function makeArea(initial) {
    const data = { ...initial };
    return {
        data,
        async remove(keys) {
            for (const key of [].concat(keys)) {
                delete data[key];
            }
        },
    };
}

// The storage an installation of 0.5.x has before it updates
function makeStorage() {
    return {
        local: makeArea({ adReportIds: ['a', 'b'], keep: 1 }),
        session: makeArea({ adReportsSession: [{ id: 'a' }], keepSession: 2 }),
    };
}

describe('removeAdReportData', () => {
    it('removes leftover ad report data on update and keeps the rest', async () => {
        const storage = makeStorage();
        await removeAdReportData({ reason: 'update', previousVersion: '0.5.1' }, storage);
        assert.deepEqual(storage.local.data, { keep: 1 });
        assert.deepEqual(storage.session.data, { keepSession: 2 });
    });

    for (const reason of ['install', 'chrome_update', 'shared_module_update']) {
        it(`removes nothing when the reason is ${reason}`, async () => {
            const storage = makeStorage();
            await removeAdReportData({ reason }, storage);
            assert.deepEqual(storage.local.data, { adReportIds: ['a', 'b'], keep: 1 });
            assert.deepEqual(storage.session.data, {
                adReportsSession: [{ id: 'a' }],
                keepSession: 2,
            });
        });
    }

    it('resolves on update when no ad report data is stored', async () => {
        const storage = {
            local: makeArea({ keep: 1 }),
            session: makeArea({}),
        };
        await removeAdReportData({ reason: 'update', previousVersion: '0.6.0' }, storage);
        assert.deepEqual(storage.local.data, { keep: 1 });
        assert.deepEqual(storage.session.data, {});
    });
});
