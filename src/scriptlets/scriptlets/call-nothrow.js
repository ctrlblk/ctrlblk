export default {
    name: 'call-nothrow.js',
    fn: callNothrow,
};

function callNothrow(chain = '') {
    if ( typeof chain !== 'string' || chain === '' ) { return; }
    const parts = chain.split('.');
    const prop = parts.pop();
    let owner = self;
    for ( const part of parts ) {
        if ( !(owner instanceof Object) ) { return; }
        owner = owner[part];
    }
    if ( !(owner instanceof Object) ) { return; }
    if ( typeof owner[prop] !== 'function' ) { return; }

    owner[prop] = new Proxy(owner[prop], {
        apply: function(target, thisArg, args) {
            try {
                return Reflect.apply(target, thisArg, args);
            } catch(ex) {
                // Swallow exception
            }
        },
    });
}
