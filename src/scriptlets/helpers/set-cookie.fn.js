export default {
    name: 'set-cookie.fn',
    fn: setCookieFn,
    dependencies: [
        'get-cookie.fn',
    ],
};

function setCookieFn(
    trusted = false,
    name = '',
    value = '',
    expires = '',
    path = '',
    options = {},
) {
    // Encode name if not trusted and has non-cookie-safe chars
    const reSafeCookieChars = /^[\w!#$%&'()*+\-./:=@^`{|}~]+$/;
    let encodedName = name;
    if ( !trusted && !reSafeCookieChars.test(name) ) {
        encodedName = encodeURIComponent(name);
    }

    // Encode value if it contains non-printable chars
    let encodedValue = String(value);
    if ( /[^\x20-\x7E]/.test(encodedValue) ) {
        encodedValue = encodeURIComponent(encodedValue);
    }

    // Check existing cookie
    if ( options.dontOverwrite ) {
        const existing = getCookieFn(name);
        if ( existing !== undefined && existing !== '' ) {
            return;
        }
    }

    // Build cookie string
    const cookieParts = [encodedName + '=' + encodedValue];

    if ( expires !== '' ) {
        if ( /^\d+$/.test(expires) ) {
            const days = parseInt(expires, 10);
            const date = new Date();
            date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
            cookieParts.push('expires=' + date.toUTCString());
        } else {
            cookieParts.push('expires=' + expires);
        }
    }

    const cookiePath = path !== '' ? path : '/';
    cookieParts.push('path=' + cookiePath);

    if ( self.location && self.location.protocol === 'https:' ) {
        cookieParts.push('Secure');
    }

    const cookieString = cookieParts.join('; ');
    document.cookie = cookieString;

    // Verify cookie was set
    const check = getCookieFn(name);
    if ( check === undefined ) {
        return false;
    }

    // Reload if requested
    if ( options.reload && check !== undefined ) {
        self.location.reload();
    }

    return true;
}
