export default {
    name: 'set-cookie-reload.js',
    fn: setCookieReload,
    world: 'ISOLATED',
    dependencies: ['set-cookie.js'],
};

function setCookieReload(name, value, path, ...args) {
    setCookie(name, value, path, 'reload', '1', ...args);
}
