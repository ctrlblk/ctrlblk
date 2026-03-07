export default {
    name: 'trusted-prune-inbound-object.js',
    requiresTrust: true,
    fn: trustedPruneInboundObject,
    dependencies: [
        'object-find-owner.fn',
        'object-prune.fn',
        'safe-self.fn',
    ],
};

function trustedPruneInboundObject(entryPoint = '', argPos = '', rawPrunePaths = '', rawNeedlePaths = '') {
    if ( entryPoint === '' ) { return; }
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('trusted-prune-inbound-object', entryPoint, argPos, rawPrunePaths);
    const extraArgs = safe.getExtraArgs(Array.from(arguments), 4);
    const argIndex = parseInt(argPos, 10) || 0;
    const dontOverwrite = extraArgs.dontOverwrite === true || extraArgs.dontOverwrite === 1;

    const logAll = rawPrunePaths === '';

    // Walk entryPoint chain to find the function
    const parts = entryPoint.split('.');
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
            if ( argIndex < args.length ) {
                const arg = args[argIndex];
                if ( arg instanceof Object ) {
                    if ( logAll ) {
                        safe.log_(logPrefix, safe.JSON_stringify(arg, null, 2));
                    } else {
                        let workArg = arg;
                        if ( dontOverwrite ) {
                            try {
                                workArg = safe.JSON_parse(safe.JSON_stringify(arg));
                            } catch(ex) {
                                workArg = arg;
                            }
                        }
                        objectPruneFn(workArg, rawPrunePaths, rawNeedlePaths, { matchAll: true }, extraArgs);
                        if ( dontOverwrite ) {
                            args[argIndex] = workArg;
                        }
                    }
                }
            }
            return Reflect.apply(target, thisArg, args);
        },
    });

    safe.log_(logPrefix, 'Installed proxy on', entryPoint);
}
