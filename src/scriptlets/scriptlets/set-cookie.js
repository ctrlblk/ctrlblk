export default {
    name: 'set-cookie.js',
    fn: setCookie,
    world: 'ISOLATED',
    dependencies: ['safe-self.fn', 'set-cookie.fn'],
};

function setCookie(name = '', value = '', path = '') {
    if ( name === '' ) { return; }
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('set-cookie', name, value, path);
    const extraArgs = safe.getExtraArgs(Array.from(arguments), 3);

    const allowedValues = [
        'accept', 'reject',
        'accepted', 'rejected',
        'allow', 'deny',
        'allowed', 'denied',
        'approve', 'disapprove',
        'approved', 'disapproved',
        'consent', 'dissent',
        'agree', 'disagree',
        'ok', 'cancel',
        'on', 'off',
        'true', 'false',
        'yes', 'no',
        'y', 'n',
        'necessary', 'required',
        'hide', 'hidden',
        'closed', 'close',
        'done',
        'opt-in', 'opt-out',
        'optin', 'optout',
    ];

    const normalizedValue = String(value).toLowerCase();

    // Check if value is in the allowed list (case-insensitive)
    let valueOk = allowedValues.includes(normalizedValue);

    // Check if numeric value <= 32767
    if ( !valueOk && /^-?\d+$/.test(value) ) {
        const n = parseInt(value, 10);
        if ( n >= -32768 && n <= 32767 ) {
            valueOk = true;
        }
    }

    if ( !valueOk ) {
        safe.log_(logPrefix, 'Value rejected:', value);
        return;
    }

    setCookieFn(false, name, value, '', path, extraArgs);
}
