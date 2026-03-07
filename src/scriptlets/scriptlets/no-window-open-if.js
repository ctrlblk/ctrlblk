export default {
    name: 'no-window-open-if.js',
    aliases: ['nowoif.js', 'prevent-window-open.js', 'window.open-defuser.js'],
    fn: noWindowOpenIf,
    dependencies: ['safe-self.fn'],
};

function noWindowOpenIf(pattern = '', delay = '', decoy = '') {
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('no-window-open-if', pattern, delay, decoy);
    const patternDetails = safe.initPattern(pattern, { canNegate: true });
    const logAll = pattern === '';
    const createDecoy = function(url) {
        if ( decoy === 'obj' ) {
            return document.createElement('object');
        }
        if ( decoy === 'blank' ) {
            const iframe = document.createElement('iframe');
            iframe.src = 'about:blank';
            iframe.style.cssText = 'display:none!important;height:0;width:0;';
            document.body.appendChild(iframe);
            return iframe;
        }
        if ( decoy !== '' ) {
            const iframe = document.createElement('iframe');
            iframe.src = url || 'about:blank';
            iframe.style.cssText = 'display:none!important;height:0;width:0;';
            document.body.appendChild(iframe);
            return iframe;
        }
        return null;
    };
    const fakeWindow = {
        closed: false,
        document: {
            write: function() {},
            writeln: function() {},
        },
        focus: function() {},
        blur: function() {},
        close: function() { this.closed = true; },
        location: {
            href: '',
            assign: function() {},
            replace: function() {},
        },
        setTimeout: function() { return 0; },
        setInterval: function() { return 0; },
        clearTimeout: function() {},
        clearInterval: function() {},
    };
    self.open = new Proxy(self.open, {
        apply: function(target, thisArg, args) {
            const url = String(args[0] || '');
            if ( logAll ) {
                safe.log_(logPrefix, `window.open(${url})`);
                return Reflect.apply(target, thisArg, args);
            }
            if ( safe.testPattern(patternDetails, url) === false ) {
                return Reflect.apply(target, thisArg, args);
            }
            safe.log_(logPrefix, `Prevented: ${url}`);
            if ( delay !== '' ) {
                const delayMs = parseInt(delay, 10) || 0;
                if ( delayMs > 0 ) {
                    setTimeout(function() {
                        createDecoy(url);
                    }, delayMs);
                } else {
                    createDecoy(url);
                }
            }
            return Object.create(fakeWindow);
        },
    });
}
