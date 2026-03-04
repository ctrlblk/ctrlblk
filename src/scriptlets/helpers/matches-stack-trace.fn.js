export default {
    name: 'matches-stack-trace.fn',
    fn: matchesStackTrace,
    dependencies: [
        'get-exception-token.fn',
        'safe-self.fn',
    ],
};

function matchesStackTrace(needleDetails, logLevel = '') {
    const safe = safeSelf();
    const exceptionToken = getExceptionToken();
    let error;
    try {
        throw new safe.Error(exceptionToken);
    } catch(ex) {
        error = ex;
    }
    const stackText = error.stack || '';
    const lines = stackText.split('\n');
    const normalizedLines = [];
    const origin = self.location ? self.location.origin : '';

    for ( const rawLine of lines ) {
        const line = rawLine.trim();
        // Skip the error message line containing the token
        if ( line.includes(exceptionToken) ) { continue; }
        if ( line === '' ) { continue; }

        // Parse stack frame: extract function name and URL
        let fnName = '';
        let url = '';
        let lineCol = '';

        // Chrome-style: "at functionName (url:line:col)" or "at url:line:col"
        const chromeMatch = /^\s*at\s+(?:(.+?)\s+\()?(.+?)(?::(\d+):(\d+))?\)?$/.exec(line);
        if ( chromeMatch ) {
            fnName = chromeMatch[1] || '';
            url = chromeMatch[2] || '';
            if ( chromeMatch[3] ) {
                lineCol = chromeMatch[3] + ':' + (chromeMatch[4] || '1');
            }
        } else {
            // Firefox-style: "functionName@url:line:col"
            const firefoxMatch = /^(.*)@(.+?)(?::(\d+):?(\d+)?)?$/.exec(line);
            if ( firefoxMatch ) {
                fnName = firefoxMatch[1] || '';
                url = firefoxMatch[2] || '';
                if ( firefoxMatch[3] ) {
                    lineCol = firefoxMatch[3] + ':' + (firefoxMatch[4] || '1');
                }
            }
        }

        // Normalize URLs
        if ( origin !== '' && url.startsWith(origin) ) {
            url = 'inlineScript';
        } else if ( url === '' || url === '<anonymous>' ) {
            url = 'injectedScript';
        }

        const parts = [];
        if ( fnName ) { parts.push(fnName); }
        if ( url ) { parts.push(url); }
        if ( lineCol ) { parts.push(lineCol); }
        normalizedLines.push(parts.join(' '));
    }

    const stackDepth = normalizedLines.length;
    const normalizedStack = stackDepth + '\t' + normalizedLines.join('\t');

    const result = safe.testPattern(needleDetails, normalizedStack);

    if ( logLevel === 'all' || (logLevel === 'match' && result) || (logLevel === 'nomatch' && !result) ) {
        safe.log_('matches-stack-trace', result ? 'MATCH' : 'NOMATCH', normalizedStack);
    }

    return result;
}
