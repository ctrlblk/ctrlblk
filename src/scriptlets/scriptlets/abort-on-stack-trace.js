export default {
    name: 'abort-on-stack-trace.js',
    aliases: ['aost.js'],
    fn: abortOnStackTrace,
    dependencies: ['get-exception-token.fn', 'matches-stack-trace.fn', 'safe-self.fn'],
};

function abortOnStackTrace(chain = '', needle = '') {
    if ( typeof chain !== 'string' || chain === '' ) { return; }
    const safe = safeSelf();
    const token = getExceptionToken();
    const extraArgs = {};
    if ( needle === '' ) {
        extraArgs.log = 'all';
    }
    const abort = function() {
        throw new ReferenceError(token);
    };
    const parts = chain.split('.');
    const makeProxy = function(owner, pos) {
        const prop = parts[pos];
        if ( pos + 1 === parts.length ) {
            const desc = safe.Object_getOwnPropertyDescriptor(owner, prop);
            if ( !desc || desc.get === undefined ) {
                let value = owner[prop];
                safe.Object_defineProperty(owner, prop, {
                    get: function() {
                        if ( matchesStackTrace(needle, extraArgs) ) {
                            abort();
                        }
                        return value;
                    },
                    set: function(newValue) {
                        if ( matchesStackTrace(needle, extraArgs) ) {
                            abort();
                        }
                        value = newValue;
                    },
                    configurable: true,
                });
            }
            return;
        }
        const value = owner[prop];
        if ( value instanceof Object ) {
            makeProxy(value, pos + 1);
            return;
        }
        safe.Object_defineProperty(owner, prop, {
            get: function() { return value; },
            set: function(newValue) {
                safe.Object_defineProperty(owner, prop, {
                    value: newValue,
                    writable: true,
                    enumerable: true,
                    configurable: true,
                });
                if ( newValue instanceof Object ) {
                    makeProxy(newValue, pos + 1);
                }
            },
            configurable: true,
        });
    };
    makeProxy(self, 0);
}
