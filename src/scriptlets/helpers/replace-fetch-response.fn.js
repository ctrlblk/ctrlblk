export default {
    name: 'replace-fetch-response.fn',
    fn: replaceFetchResponseFn,
    dependencies: [
        'match-object-properties.fn',
        'parse-properties-to-match.fn',
        'safe-self.fn',
    ],
};

function replaceFetchResponseFn(
    trusted = false,
    pattern = '',
    replacement = '',
    propsToMatch = ''
) {
    if ( trusted !== true ) { return; }
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('replace-fetch-response', pattern, replacement);
    const extraArgs = safe.getExtraArgs(Array.from(arguments), 4);
    const propNeedles = parsePropertiesToMatch(propsToMatch, 'url');
    const rePattern = safe.patternToRegex(pattern);
    const includesCheck = extraArgs.includes || '';

    self.fetch = new Proxy(self.fetch, {
        apply: function(target, thisArg, args) {
            const fetchPromise = Reflect.apply(target, thisArg, args);
            let requestProps;
            if ( args[0] instanceof Request ) {
                requestProps = {
                    url: args[0].url,
                    method: args[0].method,
                };
            } else {
                requestProps = {
                    url: String(args[0]),
                    method: args[1] && args[1].method || 'GET',
                };
            }
            if ( propNeedles.size > 0 && matchObjectProperties(propNeedles, requestProps) === false ) {
                return fetchPromise;
            }
            return fetchPromise.then(function(response) {
                const cloned = response.clone();
                return cloned.text().then(function(text) {
                    // Pre-check with includes
                    if ( includesCheck !== '' && text.includes(includesCheck) === false ) {
                        return response;
                    }
                    const newText = text.replace(rePattern, replacement);
                    if ( newText === text ) { return response; }
                    safe.log_(logPrefix, 'Replaced content in response');
                    const headers = {};
                    for ( const [k, v] of response.headers.entries() ) {
                        headers[k] = v;
                    }
                    return new Response(newText, {
                        status: response.status,
                        statusText: response.statusText,
                        headers,
                    });
                }).catch(function() {
                    return response;
                });
            });
        },
    });
}
