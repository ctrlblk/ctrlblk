export default {
    name: 'trusted-set-cookie.js',
    requiresTrust: true,
    fn: trustedSetCookie,
    world: 'ISOLATED',
    dependencies: ['safe-self.fn', 'set-cookie.fn'],
};

function trustedSetCookie(name = '', value = '', offsetExpiresSec = '', path = '') {
    if ( name === '' ) { return; }
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('trusted-set-cookie', name, value, offsetExpiresSec, path);
    const extraArgs = safe.getExtraArgs(Array.from(arguments), 4);

    // Process value placeholders
    let processedValue = value;
    if ( processedValue === '$now$' ) {
        processedValue = String(Date.now());
    } else if ( processedValue === '$currentDate$' ) {
        processedValue = new Date().toUTCString();
    } else if ( processedValue === '$currentISODate$' ) {
        processedValue = new Date().toISOString();
    }

    // Parse offsetExpiresSec to an expires string
    let expires = '';
    if ( offsetExpiresSec !== '' ) {
        let seconds = 0;
        if ( /^\d+$/.test(offsetExpiresSec) ) {
            seconds = parseInt(offsetExpiresSec, 10);
        } else if ( offsetExpiresSec === '1day' ) {
            seconds = 86400;
        } else if ( offsetExpiresSec === '1year' ) {
            seconds = 365 * 86400;
        } else {
            // Try to parse as "NNNunit" pattern
            const m = /^(\d+)(second|minute|hour|day|week|month|year)s?$/i.exec(offsetExpiresSec);
            if ( m ) {
                const n = parseInt(m[1], 10);
                const unit = m[2].toLowerCase();
                const unitSeconds = {
                    second: 1,
                    minute: 60,
                    hour: 3600,
                    day: 86400,
                    week: 604800,
                    month: 2592000,
                    year: 31536000,
                };
                seconds = n * (unitSeconds[unit] || 0);
            } else {
                seconds = parseInt(offsetExpiresSec, 10) || 0;
            }
        }
        if ( seconds > 0 ) {
            const date = new Date();
            date.setTime(date.getTime() + seconds * 1000);
            expires = date.toUTCString();
        }
    }

    setCookieFn(true, name, processedValue, expires, path, extraArgs);
}
