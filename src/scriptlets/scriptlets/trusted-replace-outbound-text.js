export default {
    name: 'trusted-replace-outbound-text.js',
    requiresTrust: true,
    fn: trustedReplaceOutboundText,
    dependencies: [
        'proxy-apply.fn',
        'safe-self.fn',
    ],
};

function trustedReplaceOutboundText(propChain = '', pattern = '', replacement = '', ...args) {
    if ( propChain === '' || pattern === '' ) { return; }
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('trusted-replace-outbound-text', propChain, pattern);
    const extraArgs = safe.getExtraArgs(args, 0);
    const patternRe = safe.patternToRegex(pattern, 'gms');
    const encoding = extraArgs.encoding || '';

    proxyApplyFn(propChain, function(context) {
        let result = context.reflect();
        if ( typeof result !== 'string' ) { return result; }

        let text = result;

        // Decode if base64
        if ( encoding === 'base64' ) {
            try {
                text = self.atob(text);
            } catch(ex) {
                return result;
            }
        }

        patternRe.lastIndex = 0;
        const replaced = text.replace(patternRe, replacement);
        if ( replaced === text ) { return result; }

        safe.log_(logPrefix, 'Replaced text in outbound call');

        // Re-encode if base64
        if ( encoding === 'base64' ) {
            return self.btoa(replaced);
        }
        return replaced;
    });
}
