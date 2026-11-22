/*******************************************************************************

    CtrlBlk - MV3 content blocker
    Derived from uBlock Origin by Raymond Hill (GPLv3):
    trustedPreventDomBypass in src/js/resources/scriptlets.js,
    Copyright (C) 2014-present Raymond Hill.

*/

export default {
    name: 'trusted-prevent-dom-bypass.js',
    requiresTrust: true,
    fn: trustedPreventDomBypass,
    dependencies: [
        'proxy-apply.fn',
        'safe-self.fn',
    ],
};

// Stop a page from taking clean natives from a fresh embedded context, such as
// an about:blank iframe, to get past what other scriptlets patched.
//
// methodPath: the method that inserts the embedded context into the DOM,
// e.g. `Node.prototype.appendChild`.
// targetProp: space-separated properties of the embedded context to replace
// with the parent's. If empty, the embedded context becomes the parent one.
function trustedPreventDomBypass(
    methodPath = '',
    targetProp = ''
) {
    if ( methodPath === '' ) { return; }
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('trusted-prevent-dom-bypass', methodPath, targetProp);
    proxyApplyFn(methodPath, function(context) {
        const elems = new Set(context.args.filter(e => e instanceof HTMLElement));
        const r = context.reflect();
        if ( elems.size === 0 ) { return r; }
        for ( const elem of elems ) {
            try {
                if ( `${elem.contentWindow}` !== '[object Window]' ) { continue; }
                if ( elem.contentWindow.location.href !== 'about:blank' ) {
                    if ( elem.contentWindow.location.href !== self.location.href ) {
                        continue;
                    }
                }
                if ( targetProp !== '' ) {
                    const chains = targetProp.split(/\s+/);
                    let me = self, it = elem.contentWindow;
                    for ( let chain of chains ) {
                        for (;;) {
                            const pos = chain.indexOf('.');
                            if ( pos === -1 ) { break; }
                            const prop = chain.slice(0, pos);
                            me = me[prop]; it = it[prop];
                            chain = chain.slice(pos+1);
                        }
                        it[chain] = me[chain];
                    }
                } else {
                    Object.defineProperty(elem, 'contentWindow', { value: self });
                }
                safe.log_(logPrefix, 'Bypass prevented');
            } catch {
            }
        }
        return r;
    });
}
