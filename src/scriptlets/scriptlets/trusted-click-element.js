export default {
    name: 'trusted-click-element.js',
    requiresTrust: true,
    fn: trustedClickElement,
    world: 'ISOLATED',
    dependencies: [
        'get-all-cookies.fn',
        'get-all-local-storage.fn',
        'run-at-html-element.fn',
        'safe-self.fn',
    ],
};

function trustedClickElement(selectors = '', extraMatch = '', delay = '') {
    if ( selectors === '' ) { return; }
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('trusted-click-element', selectors);

    const selectorList = selectors.split(',').map(function(s) { return s.trim(); });
    const delayMs = parseInt(delay, 10) || 0;
    const timeout = 10000;

    // Parse extraMatch for cookie/localStorage assertions
    const matchAssertions = function() {
        if ( extraMatch === '' ) { return true; }
        const parts = extraMatch.split(',');
        for ( const part of parts ) {
            const trimmed = part.trim();
            if ( trimmed.startsWith('cookie:') ) {
                const needle = trimmed.slice(7);
                const cookies = getAllCookiesFn();
                let found = false;
                for ( const c of cookies ) {
                    const entry = c.key + '=' + c.value;
                    if ( entry.includes(needle) || c.key === needle ) {
                        found = true;
                        break;
                    }
                }
                if ( !found ) { return false; }
            } else if ( trimmed.startsWith('localStorage:') ) {
                const needle = trimmed.slice(13);
                const items = getAllLocalStorageFn('localStorage');
                let found = false;
                for ( const item of items ) {
                    if ( item.key === needle || (item.key + '=' + item.value).includes(needle) ) {
                        found = true;
                        break;
                    }
                }
                if ( !found ) { return false; }
            }
        }
        return true;
    };

    // Resolve a selector, supporting shadow DOM traversal via >>>
    const queryShadow = function(selectorStr) {
        const segments = selectorStr.split('>>>').map(function(s) { return s.trim(); });
        let root = document;
        for ( let i = 0; i < segments.length - 1; i++ ) {
            const host = root.querySelector(segments[i]);
            if ( host === null || host.shadowRoot === null ) { return null; }
            root = host.shadowRoot;
        }
        return root.querySelector(segments[segments.length - 1]);
    };

    const clickElements = function(idx) {
        if ( idx >= selectorList.length ) { return; }

        const sel = selectorList[idx];
        const elem = sel.includes('>>>')
            ? queryShadow(sel)
            : document.querySelector(sel);

        if ( elem === null ) { return false; }

        if ( matchAssertions() === false ) { return false; }

        elem.click();
        safe.log_(logPrefix, 'Clicked:', sel);

        if ( idx + 1 < selectorList.length ) {
            if ( delayMs > 0 ) {
                setTimeout(function() {
                    clickElements(idx + 1);
                }, delayMs);
            } else {
                clickElements(idx + 1);
            }
        }
        return true;
    };

    runAtHtmlElementFn(function() {
        // Try clicking immediately
        if ( clickElements(0) ) { return; }

        // Use MutationObserver to wait for elements
        const startTime = Date.now();
        const observer = new MutationObserver(function() {
            if ( Date.now() - startTime > timeout ) {
                observer.disconnect();
                safe.log_(logPrefix, 'Timed out');
                return;
            }
            if ( clickElements(0) ) {
                observer.disconnect();
            }
        });
        observer.observe(document, {
            childList: true,
            subtree: true,
        });

        // Timeout safety net
        setTimeout(function() {
            observer.disconnect();
        }, timeout);
    });
}
