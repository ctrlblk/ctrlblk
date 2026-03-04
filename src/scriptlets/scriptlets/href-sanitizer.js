export default {
    name: 'href-sanitizer.js',
    fn: hrefSanitizer,
    world: 'ISOLATED',
    dependencies: ['run-at.fn', 'safe-self.fn'],
};

function hrefSanitizer(selector = '', source = '') {
    if ( selector === '' || source === '' ) { return; }
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('href-sanitizer', selector, source);

    const extractURL = function(anchor) {
        let url = '';

        if ( source === 'text' ) {
            url = anchor.textContent.trim();
        } else if ( source.startsWith('[') && source.endsWith(']') ) {
            const attrName = source.slice(1, -1);
            url = anchor.getAttribute(attrName) || '';
        } else if ( source.startsWith('?') ) {
            const paramName = source.slice(1);
            try {
                const hrefURL = new URL(anchor.href);
                url = hrefURL.searchParams.get(paramName) || '';
            } catch(ex) {
                // Invalid URL
            }
        }

        return url;
    };

    const validateURL = function(url) {
        if ( url === '' ) { return ''; }
        // Allow http, https, and protocol-relative URLs
        if ( url.startsWith('//') ) { return url; }
        try {
            const parsed = new URL(url);
            if ( parsed.protocol === 'http:' || parsed.protocol === 'https:' ) {
                return url;
            }
        } catch(ex) {
            // Try treating as relative URL
            try {
                const parsed = new URL(url, document.location.href);
                if ( parsed.protocol === 'http:' || parsed.protocol === 'https:' ) {
                    return url;
                }
            } catch(ex2) {
                // Not a valid URL
            }
        }
        return '';
    };

    const sanitize = function(anchor) {
        if ( anchor._hrefSanitized ) { return; }
        const targetURL = extractURL(anchor);
        const validURL = validateURL(targetURL);
        if ( validURL === '' ) { return; }

        const originalHref = anchor.href;
        if ( originalHref === validURL ) { return; }

        anchor.setAttribute('href', validURL);
        anchor._hrefSanitized = true;
        safe.log_(logPrefix, 'Sanitized:', originalHref, '->', validURL);

        // Fix other anchors with the same original href
        const others = document.querySelectorAll(
            'a[href="' + CSS.escape(originalHref) + '"]'
        );
        for ( const other of others ) {
            if ( other === anchor ) { continue; }
            if ( other._hrefSanitized ) { continue; }
            other.setAttribute('href', validURL);
            other._hrefSanitized = true;
        }
    };

    const sanitizeAll = function() {
        try {
            const anchors = document.querySelectorAll(selector);
            for ( const anchor of anchors ) {
                if ( anchor.localName !== 'a' ) { continue; }
                sanitize(anchor);
            }
        } catch(ex) {
            // Invalid selector
        }
    };

    runAt(function() {
        sanitizeAll();

        const observer = new MutationObserver(function() {
            sanitizeAll();
        });
        observer.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['href'],
        });
    }, 'interactive');
}
