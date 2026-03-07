export default {
    name: 'close-window.js',
    aliases: ['window-close-if.js'],
    fn: closeWindow,
    world: 'ISOLATED',
    dependencies: ['safe-self.fn'],
};

function closeWindow(arg1 = '') {
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('close-window', arg1);
    if ( arg1 === '' ) {
        safe.log_(logPrefix, 'Closing window');
        window.close();
        return;
    }
    let needle;
    const reMatch = /^\/(.+)\/([gimsu]*)$/.exec(arg1);
    if ( reMatch !== null ) {
        needle = new safe.RegExp(reMatch[1], reMatch[2]);
    } else {
        needle = safe.patternToRegex(arg1);
    }
    const href = window.location.href;
    if ( safe.RegExp_test.call(needle, href) ) {
        safe.log_(logPrefix, `Closing window matching: ${href}`);
        window.close();
    }
}
