export default {
    name: 'prevent-canvas.js',
    fn: preventCanvas,
    dependencies: ['safe-self.fn'],
};

function preventCanvas(contextType = '') {
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('prevent-canvas', contextType);
    const typeDetails = safe.initPattern(contextType, { canNegate: true });

    HTMLCanvasElement.prototype.getContext = new Proxy(
        HTMLCanvasElement.prototype.getContext,
        {
            apply: function(target, thisArg, args) {
                const requestedType = String(args[0] || '');
                if ( safe.testPattern(typeDetails, requestedType) ) {
                    safe.log_(logPrefix, 'Blocked canvas context:', requestedType);
                    return null;
                }
                return Reflect.apply(target, thisArg, args);
            },
        }
    );
}
