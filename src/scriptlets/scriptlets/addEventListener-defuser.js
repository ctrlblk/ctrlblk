export default {
    name: 'addEventListener-defuser.js',
    aliases: ['aeld.js', 'prevent-addEventListener.js'],
    fn: addEventListenerDefuser,
    dependencies: ['run-at.fn', 'safe-self.fn', 'should-debug.fn'],
};

function addEventListenerDefuser(type = '', pattern = '') {
    const safe = safeSelf();
    const extraArgs = safe.getExtraArgs(Array.from(arguments), 2);
    const logPrefix = safe.makeLogPrefix('addEventListener-defuser', type, pattern);
    const typeDetails = safe.initPattern(type, { canNegate: true });
    const patternDetails = safe.initPattern(pattern, { canNegate: true, flags: 'i' });
    const elemSelector = extraArgs.elements || undefined;
    const runWhen = extraArgs.runAt;
    const logAll = type === '' && pattern === '';
    if ( shouldDebug(extraArgs) ) { debugger; } // jshint ignore:line
    const targetAddEventListener = EventTarget.prototype.addEventListener;
    const targetRemoveEventListener = EventTarget.prototype.removeEventListener;
    const trapListener = function(context, type, handler) {
        if ( logAll ) {
            safe.log_(logPrefix, `${type}\n${handler}`);
            return false;
        }
        const handlerStr = typeof handler === 'function'
            ? safe.Function_toString(handler)
            : typeof handler === 'object' && handler !== null && typeof handler.handleEvent === 'function'
                ? safe.Function_toString(handler.handleEvent)
                : '';
        if ( safe.testPattern(typeDetails, type) === false ) {
            return false;
        }
        if ( safe.testPattern(patternDetails, handlerStr) === false ) {
            return false;
        }
        if ( elemSelector ) {
            if ( context instanceof Element === false ) { return false; }
            if ( context.matches(elemSelector) === false ) { return false; }
        }
        safe.log_(logPrefix, `Defused: ${type}\n${handlerStr}`);
        return true;
    };
    const installer = function() {
        EventTarget.prototype.addEventListener = new Proxy(
            targetAddEventListener,
            {
                apply: function(target, thisArg, args) {
                    const [ evType, handler ] = args;
                    if ( trapListener(thisArg, evType, handler) ) {
                        return undefined;
                    }
                    return Reflect.apply(target, thisArg, args);
                },
            }
        );
    };
    if ( runWhen ) {
        runAt(installer, runWhen);
    } else {
        installer();
    }
}
