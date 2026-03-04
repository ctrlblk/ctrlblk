export default {
    name: 'trusted-set-cookie-reload.js',
    requiresTrust: true,
    fn: trustedSetCookieReload,
    world: 'ISOLATED',
    dependencies: ['trusted-set-cookie.js'],
};

function trustedSetCookieReload(name, value, offsetExpiresSec, path, ...args) {
    trustedSetCookie(name, value, offsetExpiresSec, path, 'reload', '1', ...args);
}
