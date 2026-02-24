export default {
    name: 'spoof-css.js',
    fn: spoofCSS,
    dependencies: ['safe-self.fn'],
};

function spoofCSS(selector, ...args) {
    if ( selector === '' || selector === undefined ) { return; }
    if ( args.length < 2 ) { return; }
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('spoof-css', selector);

    // Parse property/value pairs from args
    const spoofedProps = new Map();
    for ( let i = 0; i < args.length - 1; i += 2 ) {
        spoofedProps.set(args[i], args[i + 1]);
    }

    const elMatches = function(el) {
        if ( el === null || el === undefined ) { return false; }
        if ( !(el instanceof Element) ) { return false; }
        try {
            return el.matches(selector);
        } catch(ex) {
            return false;
        }
    };

    // Proxy getComputedStyle
    const nativeGetComputedStyle = self.getComputedStyle;
    const cloakedGetComputedStyle = new Proxy(nativeGetComputedStyle, {
        apply: function(target, thisArg, args) {
            const style = Reflect.apply(target, thisArg, args);
            if ( elMatches(args[0]) === false ) { return style; }

            // Proxy the CSSStyleDeclaration
            return new Proxy(style, {
                get: function(styleTarget, prop) {
                    if ( prop === 'getPropertyValue' ) {
                        return new Proxy(styleTarget.getPropertyValue, {
                            apply: function(gpvTarget, gpvThisArg, gpvArgs) {
                                const propName = gpvArgs[0];
                                if ( spoofedProps.has(propName) ) {
                                    safe.log_(logPrefix, 'Spoofed', propName);
                                    return spoofedProps.get(propName);
                                }
                                return Reflect.apply(gpvTarget, styleTarget, gpvArgs);
                            },
                        });
                    }
                    // Convert CSS property name from camelCase
                    if ( typeof prop === 'string' ) {
                        const cssName = prop.replace(/[A-Z]/g, function(c) {
                            return '-' + c.toLowerCase();
                        });
                        if ( spoofedProps.has(cssName) ) {
                            return spoofedProps.get(cssName);
                        }
                        if ( spoofedProps.has(prop) ) {
                            return spoofedProps.get(prop);
                        }
                    }
                    const value = Reflect.get(styleTarget, prop);
                    if ( typeof value === 'function' ) {
                        return value.bind(styleTarget);
                    }
                    return value;
                },
            });
        },
    });
    self.getComputedStyle = cloakedGetComputedStyle;

    // Proxy getBoundingClientRect for width/height spoofing
    if ( spoofedProps.has('width') || spoofedProps.has('height') ) {
        const nativeGetBCR = Element.prototype.getBoundingClientRect;
        Element.prototype.getBoundingClientRect = new Proxy(nativeGetBCR, {
            apply: function(target, thisArg, args) {
                const rect = Reflect.apply(target, thisArg, args);
                if ( elMatches(thisArg) === false ) { return rect; }
                const spoofed = {};
                const keys = ['bottom', 'height', 'left', 'right', 'top', 'width', 'x', 'y'];
                for ( const key of keys ) {
                    spoofed[key] = rect[key];
                }
                if ( spoofedProps.has('width') ) {
                    spoofed.width = parseFloat(spoofedProps.get('width')) || 0;
                }
                if ( spoofedProps.has('height') ) {
                    spoofed.height = parseFloat(spoofedProps.get('height')) || 0;
                }
                return DOMRect.fromRect(spoofed);
            },
        });
    }
}
