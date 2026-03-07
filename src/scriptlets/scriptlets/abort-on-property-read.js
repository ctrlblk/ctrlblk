export default {
    name: 'abort-on-property-read.js',
    aliases: ['aopr.js'],
    fn: abortOnPropertyRead,
    dependencies: ['get-exception-token.fn', 'safe-self.fn'],
};

function abortOnPropertyRead(chain = '') {
    if ( typeof chain !== 'string' || chain === '' ) { return; }
    const safe = safeSelf();
    const token = getExceptionToken();
    const abort = function() {
        throw new ReferenceError(token);
    };
    const parts = chain.split('.');
    const makeProxy = function(owner, pos) {
        const prop = parts[pos];
        if ( pos + 1 === parts.length ) {
            safe.Object_defineProperty(owner, prop, {
                get: abort,
                set: function() {},
            });
            return;
        }
        const value = owner[prop];
        if ( value instanceof Object ) {
            makeProxy(value, pos + 1);
            return;
        }
        const desc = safe.Object_getOwnPropertyDescriptor(owner, prop);
        if ( desc && desc.set !== undefined ) { return; }
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
        });
    };
    makeProxy(self, 0);
}
