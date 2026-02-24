export default {
    name: 'generate-content.fn',
    fn: generateContentFn,
    dependencies: [
        'safe-self.fn',
    ],
};

function generateContentFn(directive) {
    const safe = safeSelf();
    const randomAlphaToken = function() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let out = '';
        for ( let i = 0; i < 10; i++ ) {
            out += chars.charAt(safe.Math_floor(safe.Math_random() * chars.length));
        }
        return out;
    };
    const generateRandomText = function(len) {
        const chars = ' abcdefghijklmnopqrstuvwxyz';
        let out = '';
        for ( let i = 0; i < len; i++ ) {
            out += chars.charAt(safe.Math_floor(safe.Math_random() * chars.length));
        }
        return out;
    };

    if ( directive === 'true' ) {
        return Promise.resolve(randomAlphaToken());
    }
    if ( directive === 'emptyObj' ) {
        return Promise.resolve('{}');
    }
    if ( directive === 'emptyArr' ) {
        return Promise.resolve('[]');
    }
    if ( directive === 'emptyStr' ) {
        return Promise.resolve('');
    }
    const lengthMatch = /^length:(\d+)(?:-(\d+))?$/.exec(directive);
    if ( lengthMatch !== null ) {
        const minLen = parseInt(lengthMatch[1], 10);
        const maxLen = lengthMatch[2] !== undefined
            ? parseInt(lengthMatch[2], 10)
            : minLen;
        const cap = 500000;
        const len = safe.Math_min(
            cap,
            minLen + safe.Math_floor(safe.Math_random() * (maxLen - minLen + 1))
        );
        return Promise.resolve(generateRandomText(len));
    }
    const warMatch = /^war:(.+)$/.exec(directive);
    if ( warMatch !== null ) {
        return new Promise(function(resolve) {
            const warName = warMatch[1];
            const xhr = new safe.XMLHttpRequest();
            let url = `${scriptletGlobals.warOrigin}/war/${warName}`;
            if ( scriptletGlobals.warSecret ) {
                url += `?secret=${scriptletGlobals.warSecret}`;
            }
            xhr.open('GET', url);
            xhr.onload = function() {
                resolve(xhr.responseText);
            };
            xhr.onerror = function() {
                resolve('');
            };
            xhr.send();
        });
    }
    return Promise.resolve('');
}
