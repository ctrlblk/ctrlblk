export default {
    name: 'remove-class.js',
    aliases: ['rc.js'],
    fn: removeClass,
    world: 'ISOLATED',
    dependencies: ['run-at.fn', 'safe-self.fn'],
};

function removeClass(rawToken = '', rawSelector = '', behavior = '') {
    if ( rawToken === '' ) { return; }
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('remove-class', rawToken, rawSelector, behavior);
    const tokens = rawToken.split(/\s*\|\s*/);
    const selector = rawSelector !== ''
        ? rawSelector
        : tokens.map(function(token) { return `.${CSS.escape(token)}`; }).join(',');
    const removeClasses = function() {
        const elements = document.querySelectorAll(selector);
        let removedCount = 0;
        for ( const element of elements ) {
            for ( const token of tokens ) {
                if ( element.classList.contains(token) === false ) { continue; }
                element.classList.remove(token);
                removedCount += 1;
            }
        }
        if ( removedCount !== 0 ) {
            safe.log_(logPrefix, `Removed ${removedCount} class(es)`);
        }
    };
    if ( behavior === 'stay' ) {
        removeClasses();
        const observer = new MutationObserver(function() {
            removeClasses();
        });
        observer.observe(document, {
            attributes: true,
            attributeFilter: ['class'],
            subtree: true,
        });
    } else {
        removeClasses();
        runAt(function() {
            removeClasses();
        }, 'interactive');
        if ( behavior !== 'stay' ) {
            runAt(function() {
                removeClasses();
            }, 'complete');
        }
    }
}
