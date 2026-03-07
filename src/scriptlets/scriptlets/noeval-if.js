export default {
    name: 'noeval-if.js',
    aliases: ['prevent-eval-if.js'],
    fn: noEvalIf,
    dependencies: ['safe-self.fn'],
};

function noEvalIf(needle = '') {
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('noeval-if', needle);
    const needleDetails = safe.initPattern(needle, { canNegate: true });
    const logAll = needle === '';
    self.eval = new Proxy(self.eval, {
        apply: function(target, thisArg, args) {
            const code = String(args[0]);
            if ( logAll ) {
                safe.log_(logPrefix, code);
                return Reflect.apply(target, thisArg, args);
            }
            if ( safe.testPattern(needleDetails, code) ) {
                safe.log_(logPrefix, 'Prevented');
                return undefined;
            }
            return Reflect.apply(target, thisArg, args);
        },
    });
}
