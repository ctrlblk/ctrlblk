export default {
    name: 'no-requestAnimationFrame-if.js',
    aliases: ['norafif.js', 'prevent-requestAnimationFrame.js'],
    fn: noRequestAnimationFrameIf,
    dependencies: ['safe-self.fn'],
};

function noRequestAnimationFrameIf(needle = '') {
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('no-requestAnimationFrame-if', needle);
    const needleDetails = safe.initPattern(needle, { canNegate: true });
    const logAll = needle === '';
    self.requestAnimationFrame = new Proxy(self.requestAnimationFrame, {
        apply: function(target, thisArg, args) {
            const callback = args[0];
            const cbStr = typeof callback === 'function'
                ? safe.Function_toString(callback)
                : String(callback);
            if ( logAll ) {
                safe.log_(logPrefix, cbStr);
                return Reflect.apply(target, thisArg, args);
            }
            if ( safe.testPattern(needleDetails, cbStr) ) {
                safe.log_(logPrefix, 'Prevented');
                return Reflect.apply(target, thisArg, [function() {}]);
            }
            return Reflect.apply(target, thisArg, args);
        },
    });
}
