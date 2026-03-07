export default {
    name: 'remove-attr.js',
    aliases: ['ra.js'],
    fn: removeAttr,
    dependencies: ['run-at.fn', 'safe-self.fn'],
};

function removeAttr(rawToken = '', rawSelector = '', behavior = '') {
    if ( rawToken === '' ) { return; }
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('remove-attr', rawToken, rawSelector, behavior);
    const tokens = rawToken.split(/\s*\|\s*/);
    const selector = rawSelector !== ''
        ? rawSelector
        : tokens.map(function(token) { return `[${CSS.escape(token)}]`; }).join(',');
    const removeAttributes = function() {
        const elements = document.querySelectorAll(selector);
        let removedCount = 0;
        for ( const element of elements ) {
            for ( const token of tokens ) {
                if ( element.hasAttribute(token) === false ) { continue; }
                element.removeAttribute(token);
                removedCount += 1;
            }
        }
        if ( removedCount !== 0 ) {
            safe.log_(logPrefix, `Removed ${removedCount} attribute(s)`);
        }
    };
    if ( behavior === 'stay' ) {
        removeAttributes();
        const observer = new MutationObserver(function() {
            removeAttributes();
        });
        observer.observe(document, {
            attributes: true,
            attributeFilter: tokens,
            subtree: true,
        });
    } else if ( behavior === 'complete' ) {
        runAt(function() {
            removeAttributes();
        }, 'idle');
    } else {
        removeAttributes();
        runAt(function() {
            removeAttributes();
        }, 'interactive');
    }
}
