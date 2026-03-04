export default {
    name: 'set-constant.fn',
    fn: setConstantFn,
    dependencies: [
        'run-at.fn',
        'safe-self.fn',
        'validate-constant.fn',
    ],
};

function setConstantFn(
    trusted = false,
    chain = '',
    rawValue = ''
) {
    if ( chain === '' ) { return; }
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('set-constant', chain, rawValue);
    const extraArgs = safe.getExtraArgs(Array.from(arguments), 3);
    const cValue = validateConstantFn(trusted, rawValue, extraArgs);
    if ( cValue === validateConstantFn ) {
        safe.log_(logPrefix, 'Invalid value:', rawValue);
        return;
    }

    let normalValue = cValue;
    const isFunctionValue = rawValue === 'noopFunc' ||
                            rawValue === 'trueFunc' ||
                            rawValue === 'falseFunc';
    if ( isFunctionValue && typeof normalValue === 'function' ) {
        const fnStr = `function ${rawValue.replace('Func', '')}() { [native code] }`;
        normalValue = new Proxy(normalValue, {
            get: function(target, prop) {
                if ( prop === 'toString' ) {
                    return function() { return fnStr; };
                }
                return Reflect.get(target, prop);
            },
        });
    }

    const thisScript = document.currentScript;

    const setChain = function(owner, chainSegments, idx) {
        const prop = chainSegments[idx];
        const isLeaf = idx === chainSegments.length - 1;

        if ( isLeaf ) {
            const descriptor = safe.Object_getOwnPropertyDescriptor(owner, prop);
            if ( descriptor && descriptor.set === undefined && descriptor.get !== undefined ) {
                return;
            }
            const currentVal = owner[prop];
            if ( currentVal !== undefined && currentVal !== null ) {
                const currentType = typeof currentVal;
                const newType = typeof normalValue;
                if ( currentType !== newType && currentType !== 'undefined' ) {
                    if ( !( currentType === 'object' && newType === 'object' ) ) {
                        safe.log_(logPrefix, 'Type mismatch:', currentType, 'vs', newType);
                    }
                }
            }
            try {
                safe.Object_defineProperty(owner, prop, {
                    get: function() {
                        if ( thisScript !== null && document.currentScript === thisScript ) {
                            return currentVal;
                        }
                        safe.log_(logPrefix, 'Get trapped');
                        return normalValue;
                    },
                    set: function(newValue) {
                        if ( newValue instanceof Function ) {
                            // Allow function assignments to pass through with caution
                        }
                        safe.log_(logPrefix, 'Set trapped');
                    },
                    configurable: true,
                });
            } catch(ex) {
                safe.err_(logPrefix, 'defineProperty failed:', ex.message);
            }
            return;
        }

        // Intermediate property
        const currentObj = owner[prop];
        if ( currentObj instanceof Object ) {
            setChain(currentObj, chainSegments, idx + 1);
            return;
        }

        try {
            let trapObj = currentObj;
            safe.Object_defineProperty(owner, prop, {
                get: function() {
                    return trapObj;
                },
                set: function(newValue) {
                    trapObj = newValue;
                    if ( newValue instanceof Object ) {
                        setChain(newValue, chainSegments, idx + 1);
                    }
                },
                configurable: true,
            });
        } catch(ex) {
            safe.err_(logPrefix, 'defineProperty for chain failed:', ex.message);
        }
    };

    const doSet = function() {
        const segments = chain.split('.');
        setChain(self, segments, 0);
    };

    if ( extraArgs.runAt ) {
        runAt(doSet, extraArgs.runAt);
    } else {
        doSet();
    }
}
