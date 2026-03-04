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
    let context = globalThis;
    let prop = target;
    for (;;) {
        const pos = prop.indexOf('.');
        if ( pos === -1 ) { break; }
        context = context[prop.slice(0, pos)];
        if ( context instanceof Object === false ) { return; }
        prop = prop.slice(pos+1);
    }
    const fn = context[prop];
    if ( typeof fn !== 'function' ) { return; }
    if ( fn.prototype && fn.prototype.constructor === fn ) {
        context[prop] = new Proxy(fn, { construct: handler });
        return (...args) => { return Reflect.construct(...args); };
    }
    context[prop] = new Proxy(fn, { apply: handler });
    return (...args) => { return Reflect.apply(...args); };
}
