export default {
    name: 'abort-current-script-core.fn',
    fn: abortCurrentScriptCore,
    dependencies: [
        'get-exception-token.fn',
        'safe-self.fn',
        'should-debug.fn',
    ],
};

function abortCurrentScriptCore(
    target = '',
    needle = '',
    context = ''
) {
    if ( typeof target !== 'string' || target === '' ) { return; }
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('abort-current-script', target, needle, context);
    const extraArgs = safe.getExtraArgs(Array.from(arguments), 3);
    const debugMode = extraArgs.debug;
    const exceptionToken = getExceptionToken();
    const chain = target.split('.');
    const prop = chain.pop();
    let owner = self;
    for ( const segment of chain ) {
        if ( owner instanceof Object === false ) { return; }
        owner = owner[segment];
    }
    if ( owner instanceof Object === false ) { return; }
    let currentValue = owner[prop];
    const currentDescriptor = safe.Object_getOwnPropertyDescriptor(owner, prop);
    if ( currentDescriptor && currentDescriptor.get !== undefined ) {
        currentValue = currentDescriptor.get();
    }
    const needleDetails = safe.initPattern(needle, { canNegate: true });
    const contextDetails = safe.initPattern(context, { canNegate: true });
    const thisScript = document.currentScript;

    const validate = function() {
        const cs = document.currentScript;
        if ( cs === null ) { return false; }
        if ( cs === thisScript ) { return false; }
        if ( needleDetails.matchAll !== true ) {
            let scriptText = cs.textContent;
            if ( cs.src ) {
                scriptText = cs.src;
            }
            if ( safe.testPattern(needleDetails, scriptText) === false ) {
                if ( debugMode === 'nomatch' || debugMode === 'all' ) {
                    safe.log_(logPrefix, 'Needle nomatch:', scriptText.slice(0, 120));
                }
                return false;
            }
        }
        if ( contextDetails.matchAll !== true ) {
            if ( safe.testPattern(contextDetails, cs.textContent) === false ) {
                if ( debugMode === 'nomatch' || debugMode === 'all' ) {
                    safe.log_(logPrefix, 'Context nomatch');
                }
                return false;
            }
        }
        if ( debugMode === 'match' || debugMode === 'all' ) {
            safe.log_(logPrefix, 'Match found');
        }
        if ( debugMode === 'install' || debugMode === 'match' || debugMode === 'all' ) {
            if ( shouldDebug({ debug: true }) ) {
                debugger; // eslint-disable-line no-debugger
            }
        }
        return true;
    };

    try {
        safe.Object_defineProperty(owner, prop, {
            get: function() {
                if ( validate() ) {
                    throw new safe.Error(exceptionToken);
                }
                return currentValue;
            },
            set: function(newValue) {
                if ( validate() ) {
                    throw new safe.Error(exceptionToken);
                }
                currentValue = newValue;
            },
            configurable: true,
        });
    } catch(ex) {
        safe.err_(logPrefix, 'Failed to install trap:', ex.message);
    }

    if ( debugMode === 'install' || debugMode === 'all' ) {
        safe.log_(logPrefix, 'Trap installed on', target);
    }
}
