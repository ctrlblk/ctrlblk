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
// In real browsers, document.currentScript is non-null while a <script>
// element is executing, then becomes null afterward.  The set-constant
// scriptlet captures thisScript = document.currentScript during setup so
// that its getter can distinguish "own script reading" from "page code
// reading".  We simulate this by setting currentScript to a sentinel
// object; test scripts should set it to null before reading trapped props
// to exercise the "page code" path.
const FAKE_SCRIPT_ELEMENT = { fake: true };

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
            currentScript: FAKE_SCRIPT_ELEMENT,
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

    it('should abort when page sets a value of different type (mustAbort)', () => {
        const sandbox = makeSandbox();
        const ctx = vm.createContext(sandbox);

        const depsCode = collectDeps('set-constant.js');
        // Trap a property as boolean false, then write a number (type mismatch).
        // mustAbort should fire and let the number through.
        // Note: mustAbort only triggers when normalValue is non-undefined/non-null.
        const script = `
            const scriptletGlobals = {};
            ${depsCode}
            setConstant('adConfig', 'false');
            // Simulate script element finishing (page code reads after this)
            document.currentScript = null;
            // Simulate page writing a number (type mismatch: boolean vs number)
            self.adConfig = 42;
            self.adConfig;
        `;

        const result = vm.runInContext(script, ctx);
        assert.equal(result, 42,
            'mustAbort should let the value through on type mismatch');
    });

    it('should not abort for undefined constant (always returns undefined)', () => {
        const sandbox = makeSandbox();
        const ctx = vm.createContext(sandbox);

        const depsCode = collectDeps('set-constant.js');
        // When the constant is undefined, mustAbort never triggers because
        // normalValue is undefined, so (normalValue !== undefined) is false.
        // The setter silently drops all writes.
        const script = `
            const scriptletGlobals = {};
            ${depsCode}
            setConstant('adSlots', 'undefined');
            self.adSlots = 'something';
            self.adSlots;
        `;

        const result = vm.runInContext(script, ctx);
        assert.equal(result, undefined,
            'undefined constant should always return undefined regardless of writes');
    });

    it('should pass write-then-read consistency check after mustAbort', () => {
        const sandbox = makeSandbox();
        const ctx = vm.createContext(sandbox);

        const depsCode = collectDeps('set-constant.js');
        // mustAbort triggers on type mismatch for non-undefined constants.
        // After that, write-then-read should be consistent.
        const script = `
            const scriptletGlobals = {};
            ${depsCode}
            setConstant('config', 'true');
            // Simulate script element finishing (page code reads after this)
            document.currentScript = null;
            // Write a string (type mismatch: boolean vs string)
            self.config = 'hello';
            const readBack = self.config;
            readBack === 'hello';
        `;

        const result = vm.runInContext(script, ctx);
        assert.equal(result, true,
            'Write-then-read should return the written value after mustAbort');
    });

    it('should maintain constant when page sets same-type value', () => {
        const sandbox = makeSandbox();
        const ctx = vm.createContext(sandbox);

        const depsCode = collectDeps('set-constant.js');
        // When the page writes a value of the SAME type as the constant,
        // mustAbort should NOT fire and the constant should be maintained.
        const script = `
            const scriptletGlobals = {};
            ${depsCode}
            setConstant('flag', 'false');
            // Page tries to set a same-type value (boolean)
            self.flag = true;
            self.flag;
        `;

        const result = vm.runInContext(script, ctx);
        assert.equal(result, false,
            'Constant should be maintained when page sets same-type value');
    });

    it('should cloak noopFunc to look native', () => {
        const sandbox = makeSandbox();
        const ctx = vm.createContext(sandbox);

        const depsCode = collectDeps('set-constant.js');
        const script = `
            const scriptletGlobals = {};
            ${depsCode}
            setConstant('myFunc', 'noopFunc');
            self.myFunc.toString();
        `;

        const result = vm.runInContext(script, ctx);
        assert.equal(result, 'function myFunc() { [native code] }',
            'noopFunc toString should look native');
    });

    it('should cloak trueFunc to look native', () => {
        const sandbox = makeSandbox();
        const ctx = vm.createContext(sandbox);

        const depsCode = collectDeps('set-constant.js');
        const script = `
            const scriptletGlobals = {};
            ${depsCode}
            setConstant('check', 'trueFunc');
            [self.check.toString(), self.check()];
        `;

        const result = vm.runInContext(script, ctx);
        assert.equal(result[0], 'function check() { [native code] }',
            'trueFunc toString should look native');
        assert.equal(result[1], true, 'trueFunc should return true');
    });

    // Note: trapProp chains previous getters/setters via prevGetter/prevSetter.
    // This is verified structurally here; full behavioral testing requires a
    // browser environment because Node's VM cross-realm boundaries prevent
    // `odesc.get instanceof Function` from matching VM-defined functions.
    it('should install trap even when property already has a descriptor', () => {
        const sandbox = makeSandbox();
        const ctx = vm.createContext(sandbox);

        const depsCode = collectDeps('set-constant.js');
        const script = `
            const scriptletGlobals = {};
            ${depsCode}
            Object.defineProperty(self, 'trackedProp', {
                value: 'original',
                writable: true,
                configurable: true,
            });
            setConstant('trackedProp', 'false');
            self.trackedProp;
        `;

        const result = vm.runInContext(script, ctx);
        assert.equal(result, false, 'Trapped value should override existing property');
    });

    it('should trap a dotted chain on an existing object', () => {
        const sandbox = makeSandbox();
        // Pre-assign the intermediate object on the sandbox so it exists
        // before the VM runs (avoids cross-realm instanceof issues).
        sandbox.self.nested = { deep: {} };
        const ctx = vm.createContext(sandbox);

        const depsCode = collectDeps('set-constant.js');
        const script = `
            const scriptletGlobals = {};
            ${depsCode}
            setConstant('nested.deep.val', '0');
            self.nested.deep.val;
        `;

        const result = vm.runInContext(script, ctx);
        assert.equal(result, 0,
            'Deep chain property should be trapped on existing objects');
    });

    it('should protect cloaked function toString from redefinition', () => {
        const sandbox = makeSandbox();
        const ctx = vm.createContext(sandbox);

        const depsCode = collectDeps('set-constant.js');
        const script = `
            const scriptletGlobals = {};
            ${depsCode}
            setConstant('fn', 'noopFunc');
            // Page attempts to redefine toString to detect the proxy
            Object.defineProperty(self.fn, 'toString', { value: () => 'caught' });
            self.fn.toString();
        `;

        const result = vm.runInContext(script, ctx);
        assert.equal(result, 'function fn() { [native code] }',
            'toString should resist redefinition via defineProperty');
    });

    it('should protect cloaked function toString from deletion', () => {
        const sandbox = makeSandbox();
        const ctx = vm.createContext(sandbox);

        const depsCode = collectDeps('set-constant.js');
        const script = `
            const scriptletGlobals = {};
            ${depsCode}
            setConstant('fn', 'noopFunc');
            // Page attempts to delete toString to detect the proxy
            delete self.fn.toString;
            self.fn.toString();
        `;

        const result = vm.runInContext(script, ctx);
        assert.equal(result, 'function fn() { [native code] }',
            'toString should resist deletion');
    });

    it('should remain aborted once mustAbort triggers', () => {
        const sandbox = makeSandbox();
        const ctx = vm.createContext(sandbox);

        const depsCode = collectDeps('set-constant.js');
        // Once mustAbort triggers (type mismatch), the trap is permanently disabled.
        // Subsequent writes should also pass through.
        const script = `
            const scriptletGlobals = {};
            ${depsCode}
            setConstant('val', 'false');
            // Simulate script element finishing (page code reads after this)
            document.currentScript = null;
            // First write: type mismatch (boolean vs number) triggers mustAbort
            self.val = 1;
            const r1 = self.val;
            // Second write: already aborted, so this should also go through
            self.val = 2;
            const r2 = self.val;
            [r1, r2];
        `;

        const result = vm.runInContext(script, ctx);
        assert.equal(result[0], 1, 'First write should pass through');
        assert.equal(result[1], 2, 'Second write should also pass through');
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

// ============================================================================

describe('object-find-owner.fn', () => {
    const objectFindOwner = byName.get('object-find-owner.fn').fn;

    it('should find a key on an object with a null prototype', () => {
        const o = Object.create(null);
        o.ad = 1;
        assert.equal(objectFindOwner(o, 'ad'), true);
    });

    it('should prune a key on an object with a null prototype', () => {
        const o = Object.create(null);
        o.ad = 1;
        assert.equal(objectFindOwner(o, 'ad', true), true);
        assert.equal('ad' in o, false, 'ad should be removed');
    });

    it('should still find a key on a normal object', () => {
        assert.equal(objectFindOwner({ ad: 1 }, 'ad'), true);
    });
});

// ============================================================================

// The nine trusted-edit-inbound-object queries of the default list
// (@ctrlblk/ctrlblk-filters/dist/default.txt, lines 36705 to 36713), with the
// filter syntax's `\,` unescaped.
const YOUTUBE_EDIT_INBOUND_QUERIES = [
    '[?.attestationRequest][?.context.client.userAgent*="channel"].context.client[?.clientName=="WEB"]+={"clientScreen":"CHANNEL"}',
    '[?.attestationRequest][?.context.client.userAgent*="yahi"]+={"params":"YAHI"}',
    '[?.attestationRequest][?.context.client.userAgent*="inline"].playbackContext.contentPlaybackContext+={"isInlinePlaybackNoAd":true}',
    '[?.attestationRequest][?.context.client.userAgent*="oaeb"]+={"params":"oAEBogYBLg"}',
    '[?.attestationRequest][?.context.client.userAgent=/adunit|channel|inline|yahi|oaeb|eafg|yaf4/].playbackContext.contentPlaybackContext.referer=repl({"regex":"(?:#reloadxhr)?$","replacement":"#reloadxhr"})',
    '[?.createCommentParams].context.client.userAgent=repl({"regex":"/; (adunit|channel|inline|yahi|oaeb|eafg|yaf4)\\b/","replacement":""})',
    '[?.serializedThirdPartyEmbedConfig][?.context.client.userAgent*="channel"].context.client[?.clientName=="WEB_EMBEDDED_PLAYER"]+={"clientScreen":"CHANNEL"}',
    '[?.serializedThirdPartyEmbedConfig][?.context.client.userAgent*="eafg"]+={"params":"eAFgAQ"}',
    '[?.context.thirdParty.embeddedPlayerContext][?.context.client.userAgent=/channel|eafg|yaf4/].playbackContext.contentPlaybackContext.referer=repl({"regex":"(?:#reloadxhr)?$","replacement":"#reloadxhr"})',
];

describe('jsonpath.fn', () => {
    it('should compile each YouTube trusted-edit-inbound-object query', () => {
        const entry = byName.get('jsonpath.fn');
        assert.ok(entry, 'helper should exist');
        const JSONPath = entry.fn;
        for ( const query of YOUTUBE_EDIT_INBOUND_QUERIES ) {
            assert.equal(JSONPath.create(query).valid, true, `query should compile: ${query}`);
        }
    });
});

// ============================================================================

describe('trusted-edit-inbound-object', () => {
    // Run the scriptlet on JSON.stringify with `query`, then return what
    // JSON.stringify makes of each object in `objects`, parsed back.
    // The sandbox gets a JSON object of its own, so the proxy stays in it.
    function stringifyWith(query, objects) {
        assert.ok(byName.get('trusted-edit-inbound-object.js'), 'scriptlet should exist');
        const sandbox = makeSandbox({
            JSON: { parse: JSON.parse, stringify: JSON.stringify },
            structuredClone,
            objects,
        });
        const ctx = vm.createContext(sandbox);
        const depsCode = collectDeps('trusted-edit-inbound-object.js');
        const script = `
            const scriptletGlobals = {};
            ${depsCode}
            trustedEditInboundObject('JSON.stringify', '0', ${JSON.stringify(query)});
            objects.map(o => JSON.stringify(o));
        `;
        return vm.runInContext(script, ctx).map(s => JSON.parse(s));
    }

    const playerRequest = userAgent => ({
        attestationRequest: {},
        context: { client: { clientName: 'WEB', userAgent } },
        playbackContext: {
            contentPlaybackContext: { referer: 'https://www.youtube.com/watch?v=KBj5zrHSliQ' },
        },
    });

    it('should merge clientScreen into a marked WEB client', () => {
        const [ out ] = stringifyWith(YOUTUBE_EDIT_INBOUND_QUERIES[0], [
            playerRequest('Mozilla/5.0 (X11; channel'),
        ]);
        assert.equal(out.context.client.clientScreen, 'CHANNEL');
        assert.equal(out.context.client.clientName, 'WEB', 'other fields should stay');
    });

    it('should leave an object without the marker unchanged', () => {
        const before = playerRequest('Mozilla/5.0 (X11; Linux x86_64)');
        const [ out ] = stringifyWith(YOUTUBE_EDIT_INBOUND_QUERIES[0], [ before ]);
        assert.deepEqual(out, before);
    });

    it('should not modify the object passed to JSON.stringify', () => {
        const before = playerRequest('Mozilla/5.0 (X11; channel');
        stringifyWith(YOUTUBE_EDIT_INBOUND_QUERIES[0], [ before ]);
        assert.equal(before.context.client.clientScreen, undefined);
    });

    it('should append #reloadxhr to the referer once', () => {
        const first = playerRequest('Mozilla/5.0 (X11; yahi');
        const again = playerRequest('Mozilla/5.0 (X11; yahi');
        again.playbackContext.contentPlaybackContext.referer += '#reloadxhr';
        const [ a, b ] = stringifyWith(YOUTUBE_EDIT_INBOUND_QUERIES[4], [ first, again ]);
        const expected = 'https://www.youtube.com/watch?v=KBj5zrHSliQ#reloadxhr';
        assert.equal(a.playbackContext.contentPlaybackContext.referer, expected);
        assert.equal(b.playbackContext.contentPlaybackContext.referer, expected);
    });
});

// ============================================================================

describe('trusted-prevent-dom-bypass', () => {
    // Append a fake iframe for each window in `frameWindows`, with the
    // scriptlet installed on Node.prototype.appendChild. Returns the
    // sandbox's own fetch.
    function appendWith(targetProp, frameWindows) {
        assert.ok(byName.get('trusted-prevent-dom-bypass.js'), 'scriptlet should exist');
        class HTMLElement {}
        const parentFetch = function fetch() {};
        const sandbox = makeSandbox({
            HTMLElement,
            Node: { prototype: { appendChild(e) { return e; } } },
            location: { href: 'https://www.youtube.com/' },
            fetch: parentFetch,
            elems: [],
        });
        for ( const contentWindow of frameWindows ) {
            const elem = new HTMLElement();
            elem.contentWindow = contentWindow;
            sandbox.elems.push(elem);
        }
        const ctx = vm.createContext(sandbox);
        const depsCode = collectDeps('trusted-prevent-dom-bypass.js');
        const script = `
            const scriptletGlobals = {};
            ${depsCode}
            trustedPreventDomBypass('Node.prototype.appendChild', ${JSON.stringify(targetProp)});
            for ( const elem of elems ) { Node.prototype.appendChild(elem); }
        `;
        vm.runInContext(script, ctx);
        return parentFetch;
    }

    // A window-like object, as an iframe's contentWindow.
    const frameWindow = href => ({
        [Symbol.toStringTag]: 'Window',
        location: { href },
        fetch: function frameFetch() {},
    });

    it('should give a blank frame the parent fetch', () => {
        const frame = frameWindow('about:blank');
        const parentFetch = appendWith('fetch', [ frame ]);
        assert.equal(frame.fetch, parentFetch);
    });

    it('should leave a frame at another URL alone', () => {
        const frame = frameWindow('https://example.com/');
        const ownFetch = frame.fetch;
        appendWith('fetch', [ frame ]);
        assert.equal(frame.fetch, ownFetch);
    });
});
