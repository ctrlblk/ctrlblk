export default {
    name: 'abort-on-property-write.js',
    aliases: ['aopw.js'],
    fn: abortOnPropertyWrite,
    dependencies: ['get-exception-token.fn', 'safe-self.fn'],
};

function abortOnPropertyWrite(prop = '') {
    if ( typeof prop !== 'string' || prop === '' ) { return; }
    const safe = safeSelf();
    const token = getExceptionToken();
    const parts = prop.split('.');
    let owner = self;
    for ( let i = 0; i < parts.length - 1; i++ ) {
        let next = owner[parts[i]];
        if ( next instanceof Object === false ) {
            const current = owner;
            const key = parts[i];
            safe.Object_defineProperty(current, key, {
                get: function() { return undefined; },
                set: function(newValue) {
                    safe.Object_defineProperty(current, key, {
                        value: newValue,
                        writable: true,
                        enumerable: true,
                        configurable: true,
                    });
                    if ( newValue instanceof Object ) {
                        abortOnPropertyWrite(parts.slice(i).join('.'));
                    }
                },
                configurable: true,
            });
            return;
        }
        owner = next;
    }
    const leafProp = parts[parts.length - 1];
    delete owner[leafProp];
    safe.Object_defineProperty(owner, leafProp, {
        get: function() { return undefined; },
        set: function() {
            throw new ReferenceError(token);
        },
        configurable: true,
    });
}
