export default {
    name: 'trusted-suppress-native-method.js',
    requiresTrust: true,
    fn: trustedSuppressNativeMethod,
    dependencies: [
        'proxy-apply.fn',
        'safe-self.fn',
    ],
};

function trustedSuppressNativeMethod(methodPath = '', signature = '', how = '', stack = '') {
    if ( methodPath === '' ) { return; }
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('trusted-suppress-native-method', methodPath, signature, how);
    const extraArgs = safe.getExtraArgs(Array.from(arguments), 4);

    // Log mode: when signature is empty, log all calls
    const logMode = signature === '';

    // Parse signature into type-checked arg matchers
    // Format: "type:value type:value ..." where type is one of: string, number, object, boolean, undefined
    // Or shorthand: "pattern" means string pattern match, "exact:value" means exact match
    const argMatchers = [];
    if ( !logMode ) {
        const sigParts = signature.split(/\s+/);
        for ( const part of sigParts ) {
            if ( part === '' ) { continue; }
            const colonIdx = part.indexOf(':');
            if ( colonIdx !== -1 ) {
                const type = part.slice(0, colonIdx);
                const val = part.slice(colonIdx + 1);
                if ( type === 'exact' ) {
                    argMatchers.push({
                        test: function(arg) {
                            return String(arg) === val;
                        },
                    });
                } else {
                    // Type-based match
                    argMatchers.push({
                        test: function(arg) {
                            if ( typeof arg !== type ) { return false; }
                            if ( val === '*' || val === '' ) { return true; }
                            return safe.RegExp_test.call(safe.patternToRegex(val), String(arg));
                        },
                    });
                }
            } else {
                // Pattern match against stringified arg
                const re = safe.patternToRegex(part);
                argMatchers.push({
                    test: function(arg) {
                        return safe.RegExp_test.call(re, String(arg));
                    },
                });
            }
        }
    }

    const stackDetails = stack !== '' ? safe.initPattern(stack) : { matchAll: true };

    proxyApplyFn(methodPath, function(context) {
        const { args } = context;

        if ( logMode ) {
            const argsSummary = [];
            for ( let i = 0; i < args.length; i++ ) {
                argsSummary.push(typeof args[i] + ':' + String(args[i]).slice(0, 80));
            }
            safe.log_(logPrefix, 'Call:', argsSummary.join(', '));
            return context.reflect();
        }

        // Check args against matchers
        if ( argMatchers.length > 0 ) {
            if ( args.length < argMatchers.length ) {
                return context.reflect();
            }
            for ( let i = 0; i < argMatchers.length; i++ ) {
                if ( argMatchers[i].test(args[i]) === false ) {
                    return context.reflect();
                }
            }
        }

        // Check stack trace
        if ( stackDetails.matchAll !== true ) {
            const stackTrace = new Error().stack || '';
            if ( safe.testPattern(stackDetails, stackTrace) === false ) {
                return context.reflect();
            }
        }

        safe.log_(logPrefix, 'Suppressed call');

        // Handle 'how' parameter
        if ( how === 'abort' ) {
            throw new ReferenceError('Aborted by trusted-suppress-native-method');
        }

        // Default: suppress (return undefined)
        return undefined;
    });
}
