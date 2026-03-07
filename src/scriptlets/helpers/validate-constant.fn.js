export default {
    name: 'validate-constant.fn',
    fn: validateConstantFn,
    dependencies: [
        'safe-self.fn',
    ],
};

function validateConstantFn(trusted, raw) {
    const safe = safeSelf();
    const extraArgs = safe.getExtraArgs(Array.from(arguments), 2);
    let value;
    if ( raw === 'undefined' ) {
        value = undefined;
    } else if ( raw === 'false' ) {
        value = false;
    } else if ( raw === 'true' ) {
        value = true;
    } else if ( raw === 'null' ) {
        value = null;
    } else if ( raw === "''" || raw === '' ) {
        value = '';
    } else if ( raw === '[]' || raw === 'emptyArr' ) {
        value = [];
    } else if ( raw === '{}' || raw === 'emptyObj' ) {
        value = {};
    } else if ( raw === 'noopFunc' ) {
        value = function() {};
    } else if ( raw === 'trueFunc' ) {
        value = function() { return true; };
    } else if ( raw === 'falseFunc' ) {
        value = function() { return false; };
    } else if ( /^-?\d+$/.test(raw) ) {
        const n = parseInt(raw, 10);
        if ( n >= -0x7FFF && n <= 0x7FFF ) {
            value = n;
        } else {
            return validateConstantFn;
        }
    } else if ( trusted && raw.startsWith('{') && raw.endsWith('}') ) {
        try {
            const parsed = safe.JSON_parse(raw);
            if ( parsed && parsed.value !== undefined ) {
                value = parsed.value;
            } else {
                return validateConstantFn;
            }
        } catch(ex) {
            return validateConstantFn;
        }
    } else {
        return validateConstantFn;
    }
    if ( extraArgs.as !== undefined ) {
        if ( extraArgs.as === 'function' ) {
            return function() { return value; };
        }
        if ( extraArgs.as === 'callback' ) {
            return function() {
                return function() { return value; };
            };
        }
        if ( extraArgs.as === 'resolved' ) {
            return Promise.resolve(value);
        }
        if ( extraArgs.as === 'rejected' ) {
            return Promise.reject(value);
        }
    }
    return value;
}
