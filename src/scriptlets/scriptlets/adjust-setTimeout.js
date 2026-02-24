export default {
    name: 'adjust-setTimeout.js',
    aliases: ['nano-setTimeout-booster.js', 'nano-stb.js'],
    fn: adjustSetTimeout,
    dependencies: ['safe-self.fn'],
};

function adjustSetTimeout(needleArg = '', delayArg = '', boostArg = '') {
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('adjust-setTimeout', needleArg, delayArg, boostArg);
    const needleDetails = safe.initPattern(needleArg, { canNegate: true });
    const targetDelay = delayArg !== '*'
        ? parseInt(delayArg, 10) || 1000
        : -1;
    let boost = parseFloat(boostArg);
    if ( isNaN(boost) || boost === 0 ) { boost = 0.05; }
    if ( boost < 0.001 ) { boost = 0.001; }
    if ( boost > 50 ) { boost = 50; }
    self.setTimeout = new Proxy(self.setTimeout, {
        apply: function(target, thisArg, args) {
            const [ callback, delay ] = args;
            if ( delay === undefined ) {
                return Reflect.apply(target, thisArg, args);
            }
            const cbStr = typeof callback === 'function'
                ? safe.Function_toString(callback)
                : String(callback);
            if ( safe.testPattern(needleDetails, cbStr) ) {
                if ( targetDelay === -1 || delay === targetDelay ) {
                    args[1] = Math.round(delay * boost);
                    safe.log_(logPrefix, `Boosted delay: ${delay} => ${args[1]}`);
                }
            }
            return Reflect.apply(target, thisArg, args);
        },
    });
}
