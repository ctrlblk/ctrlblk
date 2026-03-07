export default {
    name: 'no-setInterval-if.js',
    aliases: ['nosiif.js', 'prevent-setInterval.js', 'setInterval-defuser.js'],
    fn: noSetIntervalIf,
    dependencies: ['safe-self.fn'],
};

function noSetIntervalIf(needle = '', delay = '') {
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('no-setInterval-if', needle, delay);
    const needleDetails = safe.initPattern(needle, { canNegate: true });
    const delayDetails = safe.initPattern(delay, { canNegate: true });
    const logAll = needle === '' && delay === '';
    self.setInterval = new Proxy(self.setInterval, {
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
