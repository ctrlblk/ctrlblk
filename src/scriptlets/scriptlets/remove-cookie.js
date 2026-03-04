export default {
    name: 'remove-cookie.js',
    aliases: ['cookie-remover.js'],
    fn: cookieRemover,
    world: 'ISOLATED',
    dependencies: ['safe-self.fn'],
};

function cookieRemover(needle = '') {
    const safe = safeSelf();
    const extraArgs = safe.getExtraArgs(Array.from(arguments), 1);
    const needleDetails = safe.initPattern(needle);

    const removeCookies = function() {
        const cookieStr = document.cookie;
        if ( typeof cookieStr !== 'string' || cookieStr === '' ) { return; }
        const cookies = cookieStr.split(';');
        for ( const cookie of cookies ) {
            const trimmed = cookie.trim();
            const eqIdx = trimmed.indexOf('=');
            if ( eqIdx === -1 ) { continue; }
            const name = trimmed.slice(0, eqIdx).trim();
            if ( safe.testPattern(needleDetails, name) === false ) { continue; }
            removeCookie(name);
        }
    };

    const removeCookie = function(name) {
        const domainParts = document.location.hostname.split('.');
        const domains = [''];
        for ( let i = domainParts.length; i > 0; i-- ) {
            domains.push('.' + domainParts.slice(-i).join('.'));
        }
        const paths = ['/', document.location.pathname];
        const expiry = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
        for ( const domain of domains ) {
            for ( const path of paths ) {
                let cookieStr = name + '=; Max-Age=-1000; ' + expiry + '; path=' + path;
                if ( domain !== '' ) {
                    cookieStr += '; domain=' + domain;
                }
                document.cookie = cookieStr;
            }
        }
    };

    removeCookies();

    self.addEventListener('beforeunload', removeCookies);

    if ( extraArgs.when === 'scroll' ) {
        let throttled = false;
        self.addEventListener('scroll', function() {
            if ( throttled ) { return; }
            throttled = true;
            setTimeout(function() { throttled = false; }, 500);
            removeCookies();
        }, { passive: true });
    } else if ( extraArgs.when === 'keydown' ) {
        let throttled = false;
        self.addEventListener('keydown', function() {
            if ( throttled ) { return; }
            throttled = true;
            setTimeout(function() { throttled = false; }, 500);
            removeCookies();
        });
    }

    if ( document.readyState === 'loading' ) {
        self.addEventListener('load', removeCookies, { once: true });
    }
}
