export default {
    name: 'get-all-cookies.fn',
    fn: getAllCookiesFn,
};

function getAllCookiesFn() {
    const cookieStr = document.cookie;
    if ( typeof cookieStr !== 'string' ) { return []; }
    if ( cookieStr === '' ) { return []; }
    const result = [];
    const parts = cookieStr.split(';');
    for ( const part of parts ) {
        const trimmed = part.trim();
        if ( trimmed === '' ) { continue; }
        const eqIdx = trimmed.indexOf('=');
        if ( eqIdx === 0 ) { continue; }
        if ( eqIdx === -1 ) {
            result.push({ key: trimmed, value: '' });
            continue;
        }
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim();
        result.push({ key, value });
    }
    return result;
}
