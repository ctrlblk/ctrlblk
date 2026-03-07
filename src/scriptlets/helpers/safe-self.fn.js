export default {
    name: 'safe-self.fn',
    fn: safeSelf,
};

function safeSelf() {
    if ( scriptletGlobals.safeSelf ) {
        return scriptletGlobals.safeSelf;
    }
    const safe = {
        Array_from: Array.from,
        Error: self.Error,
        Function_toStringFn: self.Function.prototype.toString,
        Function_toString: function(thisArg) {
            return safe.Function_toStringFn.call(thisArg);
        },
        Math_floor: Math.floor,
        Math_max: Math.max,
        Math_min: Math.min,
        Math_random: Math.random,
        Object: self.Object,
        Object_defineProperty: self.Object.defineProperty.bind(self.Object),
        Object_defineProperties: self.Object.defineProperties.bind(self.Object),
        Object_fromEntries: self.Object.fromEntries.bind(self.Object),
        Object_getOwnPropertyDescriptor: self.Object.getOwnPropertyDescriptor.bind(self.Object),
        RegExp: self.RegExp,
        RegExp_test: self.RegExp.prototype.test,
        RegExp_exec: self.RegExp.prototype.exec,
        Request_clone: self.Request.prototype.clone,
        XMLHttpRequest: self.XMLHttpRequest,
        addEventListener: self.EventTarget.prototype.addEventListener,
        removeEventListener: self.EventTarget.prototype.removeEventListener,
        fetch: self.fetch,
        JSON: self.JSON,
        JSON_parseFn: self.JSON.parse,
        JSON_stringifyFn: self.JSON.stringify,
        JSON_parse: function(...args) {
            return safe.JSON_parseFn.call(safe.JSON, ...args);
        },
        JSON_stringify: function(...args) {
            return safe.JSON_stringifyFn.call(safe.JSON, ...args);
        },
        log: console.log.bind(console),
        logLevel: 0,
        makeLogPrefix: function(...args) {
            if ( safe.sendToLogger ) {
                return '[' + args.join(' \u205D ') + ']';
            }
            return '';
        },
        log_: function(...args) {
            if ( safe.sendToLogger && args.length !== 0 ) {
                safe.sendToLogger('info', ...args);
            }
        },
        err_: function(...args) {
            if ( safe.sendToLogger && args.length !== 0 ) {
                safe.sendToLogger('error', ...args);
            }
        },
        escapeRegexChars: function(s) {
            return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        },
        initPattern: function(pattern, options = {}) {
            if ( pattern === '' || pattern === undefined ) {
                return { matchAll: true };
            }
            let expect = true;
            if ( options.canNegate && pattern.startsWith('!') ) {
                pattern = pattern.slice(1);
                expect = false;
            }
            const reMatch = /^\/(.+)\/([gimsu]*)$/.exec(pattern);
            if ( reMatch !== null ) {
                return {
                    re: new safe.RegExp(reMatch[1], reMatch[2]),
                    expect,
                };
            }
            if ( options.flags !== undefined ) {
                return {
                    re: new safe.RegExp(safe.escapeRegexChars(pattern), options.flags),
                    expect,
                };
            }
            return { pattern, expect };
        },
        testPattern: function(details, haystack) {
            if ( details.matchAll ) { return true; }
            if ( details.re ) {
                return safe.RegExp_test.call(details.re, haystack) === details.expect;
            }
            return haystack.includes(details.pattern) === details.expect;
        },
        patternToRegex: function(pattern, flags = undefined, verbatim = false) {
            if ( pattern === '' ) {
                return /^/;
            }
            const reMatch = /^\/(.+)\/([gimsu]*)$/.exec(pattern);
            if ( reMatch !== null ) {
                return new safe.RegExp(reMatch[1], reMatch[2] || flags);
            }
            const escaped = safe.escapeRegexChars(pattern);
            if ( verbatim ) {
                return new safe.RegExp('^' + escaped + '$', flags);
            }
            return new safe.RegExp(escaped, flags);
        },
        getExtraArgs: function(args, offset = 0) {
            const entries = [];
            for ( let i = offset; i < args.length - 1; i += 2 ) {
                const key = args[i];
                let value = args[i + 1];
                if ( /^\d+$/.test(value) ) {
                    value = parseInt(value, 10);
                }
                entries.push([key, value]);
            }
            return safe.Object_fromEntries(entries);
        },
        onIdle: function(fn, options) {
            if ( self.requestIdleCallback ) {
                return self.requestIdleCallback(fn, options);
            }
            return self.requestAnimationFrame(fn);
        },
    };

    scriptletGlobals.safeSelf = safe;

    if ( scriptletGlobals.bcSecret ) {
        let logBuffer = [];
        let bcReady = false;
        const bc = new self.BroadcastChannel(scriptletGlobals.bcSecret);
        safe.logLevel = scriptletGlobals.logLevel || 1;

        safe.sendToLogger = function(level, ...args) {
            const msg = `[${level}] ${args.join(' ')}`;
            if ( bcReady ) {
                bc.postMessage({ what: 'scriptletLog', msg });
            } else {
                logBuffer.push(msg);
            }
        };

        bc.onmessage = function(ev) {
            const data = ev.data;
            if ( typeof data !== 'string' ) { return; }
            if ( data === 'iamready!' ) {
                bcReady = true;
                for ( const msg of logBuffer ) {
                    bc.postMessage({ what: 'scriptletLog', msg });
                }
                logBuffer = [];
            } else if ( data === 'setScriptletLogLevelToOne' ) {
                safe.logLevel = 1;
            } else if ( data === 'setScriptletLogLevelToTwo' ) {
                safe.logLevel = 2;
            }
        };

        bc.postMessage('areyouready?');
    }

    return safe;
}
