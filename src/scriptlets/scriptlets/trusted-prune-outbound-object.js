export default {
    name: 'trusted-prune-outbound-object.js',
    requiresTrust: true,
    fn: trustedPruneOutboundObject,
    dependencies: [
        'object-prune.fn',
        'proxy-apply.fn',
        'safe-self.fn',
    ],
};

function trustedPruneOutboundObject(propChain = '', rawPrunePaths = '', rawNeedlePaths = '') {
    if ( propChain === '' ) { return; }
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('trusted-prune-outbound-object', propChain, rawPrunePaths);
    const extraArgs = safe.getExtraArgs(Array.from(arguments), 3);
    const logAll = rawPrunePaths === '';

    proxyApplyFn(propChain, function(context) {
        const result = context.reflect();
        if ( result instanceof Object === false ) { return result; }
        if ( logAll ) {
            safe.log_(logPrefix, safe.JSON_stringify(result, null, 2));
            return result;
        }
        objectPruneFn(result, rawPrunePaths, rawNeedlePaths, { matchAll: true }, extraArgs);
        return result;
    });
}
