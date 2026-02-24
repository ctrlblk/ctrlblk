export default {
    name: 'proxy-apply.fn',
    fn: proxyApplyFn,
    dependencies: [
        'safe-self.fn',
    ],
};

function proxyApplyFn(
    target = '',
    handler = ''
) {
    let owner = globalThis;
    let prop = target;
    for (;;) {
        const pos = prop.indexOf('.');
        if ( pos === -1 ) { break; }
        owner = owner[prop.slice(0, pos)];
        if ( owner instanceof Object === false ) { return; }
        prop = prop.slice(pos+1);
    }
    const fn = owner[prop];
    if ( typeof fn !== 'function' ) { return; }
    if ( fn.prototype && fn.prototype.constructor === fn ) {
        owner[prop] = new Proxy(fn, {
            construct(target, args) {
                const context = { args, reflect() { return Reflect.construct(target, args); } };
                return handler(context);
            }
        });
        return (...args) => { return Reflect.construct(...args); };
    }
    owner[prop] = new Proxy(fn, {
        apply(target, thisArg, args) {
            const context = { args, reflect() { return Reflect.apply(target, thisArg, args); } };
            return handler(context);
        }
    });
    return (...args) => { return Reflect.apply(...args); };
}
