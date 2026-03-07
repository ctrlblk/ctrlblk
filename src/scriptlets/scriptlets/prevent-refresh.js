export default {
    name: 'prevent-refresh.js',
    aliases: ['refresh-defuser.js'],
    fn: preventRefresh,
    world: 'ISOLATED',
    dependencies: ['run-at.fn', 'safe-self.fn'],
};

function preventRefresh(arg1 = '') {
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('prevent-refresh', arg1);
    const delayOverride = parseInt(arg1, 10);
    runAt(function() {
        const meta = document.querySelector('meta[http-equiv="refresh" i][content]');
        if ( meta === null ) { return; }
        const content = meta.getAttribute('content');
        if ( content === null || content === '' ) { return; }
        const match = /^\s*(\d+)\s*;/.exec(content);
        const delay = match !== null ? parseInt(match[1], 10) : 0;
        const effectiveDelay = isNaN(delayOverride) === false
            ? delayOverride
            : delay;
        safe.log_(logPrefix, `Stopping refresh after ${effectiveDelay}s`);
        if ( effectiveDelay !== 0 ) {
            setTimeout(function() { window.stop(); }, effectiveDelay * 1000);
        } else {
            window.stop();
        }
        meta.remove();
    }, 'interactive');
}
