export default {
    name: 'set-local-storage-item.fn',
    fn: setLocalStorageItemFn,
    dependencies: [
        'safe-self.fn',
    ],
};

function setLocalStorageItemFn(
    which = 'local',
    trusted = false,
    key = '',
    value = '',
) {
    if ( key === '' ) { return; }
    const safe = safeSelf();

    // Compatibility aliases
    if ( value === 'emptyArr' ) { value = '[]'; }
    if ( value === 'emptyObj' ) { value = '{}'; }

    // Whitelist of allowed values for untrusted mode
    const allowedValues = [
        'undefined', 'null', 'false', 'true', '{}', '[]', '""', "''",
        '', 'yes', 'no', 'on', 'off', 'accept', 'accepted',
        'reject', 'rejected', 'deny', 'denied',
        'allow', 'allowed', 'disallow', 'disabled', 'enabled',
        'ok', 'done', 'necessary', 'required', 'optional',
    ];
    if ( !trusted ) {
        if ( allowedValues.includes(value) === false ) {
            if ( /^-?\d+$/.test(value) === false ) {
                return;
            }
        }
    }

    // Determine storage name
    const storageName = which === 'local' ? 'localStorage' : 'sessionStorage';
    const storage = self[storageName];
    if ( !storage ) { return; }

    // Trusted mode: replace placeholders
    if ( trusted ) {
        const now = Date.now();
        value = value.replace(/\$now\$/g, String(now));
        value = value.replace(/\$currentDate\$/g, new Date().toLocaleDateString());
        value = value.replace(/\$currentISODate\$/g, new Date().toISOString());
    }

    // Handle $remove$ directive
    if ( value === '$remove$' ) {
        const reKey = safe.patternToRegex(key);
        const keysToRemove = [];
        for ( let i = 0, n = storage.length; i < n; i++ ) {
            const k = storage.key(i);
            if ( safe.RegExp_test.call(reKey, k) ) {
                keysToRemove.push(k);
            }
        }
        for ( const k of keysToRemove ) {
            storage.removeItem(k);
        }
        return;
    }

    try {
        storage.setItem(key, value);
    } catch(ex) {
        safe.err_('set-local-storage-item', ex.message);
    }
}
