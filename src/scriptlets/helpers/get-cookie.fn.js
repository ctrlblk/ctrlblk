export default {
    name: 'get-cookie.fn',
    fn: getCookieFn,
};

function getCookieFn(name = '') {
    const cookieStr = document.cookie;
    if ( typeof cookieStr !== 'string' ) { return; }
    const parts = cookieStr.split(';');
    for ( const part of parts ) {
        const trimmed = part.trim();
        const eqIdx = trimmed.indexOf('=');
        if ( eqIdx === -1 ) { continue; }
        const key = trimmed.slice(0, eqIdx).trim();
        if ( key !== name ) { continue; }
        return trimmed.slice(eqIdx + 1).trim();
    }
}
