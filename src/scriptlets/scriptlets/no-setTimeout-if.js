export default {
    name: 'no-setTimeout-if.js',
    aliases: ['nostif.js', 'prevent-setTimeout.js', 'setTimeout-defuser.js'],
    fn: noSetTimeoutIf,
    dependencies: ['safe-self.fn'],
};

function noSetTimeoutIf(needle = '', delay = '') {
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('no-setTimeout-if', needle, delay);
    const needleDetails = safe.initPattern(needle, { canNegate: true });
    const delayDetails = safe.initPattern(delay, { canNegate: true });
    const logAll = needle === '' && delay === '';
    self.setTimeout = new Proxy(self.setTimeout, {
        apply: function(target, thisArg, args) {
            const callback = args[0];
            const delayVal = args[1];
            const cbStr = typeof callback === 'function'
                ? safe.Function_toString(callback)
                : String(callback);
            if ( logAll ) {
                safe.log_(logPrefix, `${cbStr} (delay: ${delayVal})`);
                return Reflect.apply(target, thisArg, args);
            }
            if ( safe.testPattern(needleDetails, cbStr) &&
                 safe.testPattern(delayDetails, String(delayVal)) ) {
                safe.log_(logPrefix, 'Prevented');
                return undefined;
            }
            return Reflect.apply(target, thisArg, args);
        },
    });
}
