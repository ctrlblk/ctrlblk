// Behavioral unit tests for priority scriptlets.
// Run with: node --test tests/scriptlets/behavior.test.js
//
// These run scriptlet functions in a minimal VM context that emulates
// the browser globals the scriptlets expect.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

import { builtinScriptlets } from '../../src/scriptlets/index.js';

const byName = new Map(builtinScriptlets.map(s => [s.name, s]));

// Collect all dependency source code for a scriptlet (recursively).
function collectDeps(name, seen = new Set()) {
    if ( seen.has(name) ) return '';
    seen.add(name);
    const entry = byName.get(name);
    if ( !entry ) return '';
    let code = '';
    for ( const dep of (entry.dependencies || []) ) {
        code += collectDeps(dep, seen);
    }
    code += `// --- ${name} ---\n`;
    code += entry.fn.toString() + ';\n';
    return code;
}

// Build a sandbox with minimal browser-like globals.
function makeSandbox(extras = {}) {
    // Stub classes that safe-self.fn.js reads .prototype from
    class FakeRequest { clone() {} }
    class FakeXMLHttpRequest {}
    class FakeBroadcastChannel { postMessage() {} onmessage() {} }
    class FakeBlob {}
    class FakeURL { static createObjectURL() { return ''; } static revokeObjectURL() {} }

    const sandbox = {
        self: {},
        console: { log() {}, info() {}, error() {}, warn() {} },
        document: {
            location: { hostname: 'example.com' },
            createElement() { return { remove() {}, append() {} }; },
            currentScript: null,
            head: null,
            documentElement: null,
        },
        Object, Array, Map, Set, WeakMap, WeakSet,
        RegExp, Error, TypeError, RangeError, ReferenceError, EvalError, URIError,
        JSON, Math, Number, String, Symbol, Boolean,
        parseInt, parseFloat, isNaN, isFinite,
        undefined, NaN, Infinity,
        setTimeout: () => 0,
        clearTimeout: () => {},
        setInterval: () => 0,
        clearInterval: () => {},
        requestAnimationFrame: () => 0,
        requestIdleCallback: (fn) => { fn(); return 0; },
        EventTarget: { prototype: { addEventListener() {}, removeEventListener() {} } },
        Request: FakeRequest,
        XMLHttpRequest: FakeXMLHttpRequest,
        BroadcastChannel: FakeBroadcastChannel,
        Blob: FakeBlob,
        URL: FakeURL,
        Function,
        Proxy,
        Reflect,
        ...extras,
    };
    sandbox.self = sandbox;
    sandbox.globalThis = sandbox;
    sandbox.window = sandbox;
    return sandbox;
}

// ============================================================================

describe('abort-on-property-read', () => {
    it('should throw when trapped property is accessed', () => {
        const entry = byName.get('abort-on-property-read.js');
        assert.ok(entry, 'scriptlet should exist');

        const sandbox = makeSandbox();
        const ctx = vm.createContext(sandbox);

        // Build the scriptlet globals + deps + scriptlet
        const depsCode = collectDeps('abort-on-property-read.js');
        const script = `
            const scriptletGlobals = {};
            ${depsCode}
            abortOnPropertyRead('testProp');
        `;

        vm.runInContext(script, ctx);

        // Accessing testProp on the sandbox should throw (ReferenceError from the abort)
        assert.throws(() => {
            vm.runInContext('self.testProp', ctx);
        }, 'Accessing trapped property should throw');
    });
});

// ============================================================================

describe('set-constant', () => {
    it('should set a property to a constant value', () => {
        const entry = byName.get('set-constant.js');
        assert.ok(entry, 'scriptlet should exist');

        const sandbox = makeSandbox();
        const ctx = vm.createContext(sandbox);

        const depsCode = collectDeps('set-constant.js');
        const script = `
            const scriptletGlobals = {};
            ${depsCode}
            setConstant('myFlag', 'true');
            self.myFlag;
        `;

        const result = vm.runInContext(script, ctx);
        assert.equal(result, true, 'myFlag should be set to boolean true');
    });

    it('should set a property to noopFunc', () => {
        const sandbox = makeSandbox();
        const ctx = vm.createContext(sandbox);

        const depsCode = collectDeps('set-constant.js');
        const script = `
            const scriptletGlobals = {};
            ${depsCode}
            setConstant('myFunc', 'noopFunc');
            typeof self.myFunc;
        `;

        const result = vm.runInContext(script, ctx);
        assert.equal(result, 'function', 'myFunc should be a function');
    });

    it('should set a property to undefined (YouTube ad blocking)', () => {
        const sandbox = makeSandbox();
        sandbox.self.ytInitialPlayerResponse = { playerAds: [1, 2, 3], otherData: 'keep' };
        const ctx = vm.createContext(sandbox);

        const depsCode = collectDeps('set-constant.js');
        const script = `
            const scriptletGlobals = {};
            ${depsCode}
            setConstant('ytInitialPlayerResponse.playerAds', 'undefined');
            self.ytInitialPlayerResponse.playerAds;
        `;

        const result = vm.runInContext(script, ctx);
        assert.equal(result, undefined, 'playerAds should be set to undefined');
    });

    it('should reject unknown constant values', () => {
        const sandbox = makeSandbox();
        const ctx = vm.createContext(sandbox);

        const depsCode = collectDeps('set-constant.js');
        const script = `
            const scriptletGlobals = {};
            ${depsCode}
            setConstant('myProp', 'invalidValue');
            self.myProp;
        `;

        const result = vm.runInContext(script, ctx);
        assert.equal(result, undefined, 'myProp should not be set for invalid values');
    });
});

// ============================================================================

describe('json-prune', () => {
    it('should remove specified keys from JSON.parse output', () => {
        const sandbox = makeSandbox();
        const ctx = vm.createContext(sandbox);

        const depsCode = collectDeps('json-prune.js');
        const script = `
            const scriptletGlobals = {};
            ${depsCode}
            jsonPrune('ad tracking');
            JSON.parse('{"ad": 1, "content": 2, "tracking": 3}');
        `;

        const result = vm.runInContext(script, ctx);
        assert.equal(result.ad, undefined, 'ad key should be pruned');
        assert.equal(result.tracking, undefined, 'tracking key should be pruned');
        assert.equal(result.content, 2, 'content key should remain');
    });
});

// ============================================================================

describe('set-cookie', () => {
    it('should set a cookie with the correct value', () => {
        let setCookieValue = '';
        const sandbox = makeSandbox();
        // Provide a document with cookie setter
        sandbox.document = {
            location: { hostname: 'example.com' },
            get cookie() { return setCookieValue; },
            set cookie(v) { setCookieValue = v; },
        };
        const ctx = vm.createContext(sandbox);

        const depsCode = collectDeps('set-cookie.js');
        const script = `
            const scriptletGlobals = {};
            ${depsCode}
            setCookie('testCookie', '1', '/');
        `;

        vm.runInContext(script, ctx);
        assert.ok(setCookieValue.includes('testCookie=1'),
            `Cookie should contain testCookie=1, got: ${setCookieValue}`);
    });
});
