export default {
    name: 'trusted-replace-argument.js',
    requiresTrust: true,
    fn: trustedReplaceArgument,
    dependencies: [
        'proxy-apply.fn',
        'safe-self.fn',
        'validate-constant.fn',
    ],
};

function trustedReplaceArgument(propChain = '', argposRaw = '', argraw = '') {
    if ( propChain === '' ) { return; }
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('trusted-replace-argument', propChain, argposRaw, argraw);
    const extraArgs = safe.getExtraArgs(Array.from(arguments), 3);
    const argpos = parseInt(argposRaw, 10) || 0;
    const newValue = validateConstantFn(true, argraw, extraArgs);

    if ( newValue === undefined && argraw !== 'undefined' ) {
        safe.log_(logPrefix, 'Invalid replacement value:', argraw);
        return;
    }

    const conditionRaw = extraArgs.condition;
    let conditionRe = null;
    if ( conditionRaw ) {
        conditionRe = safe.patternToRegex(conditionRaw);
    }

    proxyApplyFn(propChain, function(context) {
        const { args } = context;

        if ( argpos >= args.length ) {
            return context.reflect();
        }

        // Check condition if specified
        if ( conditionRe !== null ) {
            const currentVal = String(args[argpos]);
            if ( safe.RegExp_test.call(conditionRe, currentVal) === false ) {
                return context.reflect();
            }
        }

        safe.log_(logPrefix, 'Replaced arg', argpos, ':', args[argpos], '->', newValue);
        args[argpos] = newValue;
        return context.reflect();
    });
}
