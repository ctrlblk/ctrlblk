export default {
    name: 'evaldata-prune.js',
    fn: evaldataPrune,
    dependencies: ['object-prune.fn'],
};

function evaldataPrune(rawPrunePaths = '', rawNeedlePaths = '') {
    const safe = safeSelf();
    const extraArgs = safe.getExtraArgs(Array.from(arguments), 2);
    const stackNeedleDetails = safe.initPattern(extraArgs.stackToMatch || '', { canNegate: true });
    const originalEval = self.eval;
    self.eval = new Proxy(originalEval, {
        apply: function(target, thisArg, args) {
            const result = Reflect.apply(target, thisArg, args);
            if ( result instanceof Object ) {
                objectPruneFn(result, rawPrunePaths, rawNeedlePaths, stackNeedleDetails, extraArgs);
            }
            return result;
        },
    });
}
