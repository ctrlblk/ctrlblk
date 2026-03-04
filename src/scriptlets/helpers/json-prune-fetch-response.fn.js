export default {
    name: 'json-prune-fetch-response.fn',
    fn: jsonPruneFetchResponseFn,
    dependencies: [
        'match-object-properties.fn',
        'object-prune.fn',
        'parse-properties-to-match.fn',
        'safe-self.fn',
    ],
};

function jsonPruneFetchResponseFn(
    rawPrunePaths = '',
    rawNeedlePaths = ''
) {
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('json-prune-fetch-response', rawPrunePaths, rawNeedlePaths);
    const extraArgs = safe.getExtraArgs(Array.from(arguments), 2);
    const propNeedles = parsePropertiesToMatch(extraArgs.propsToMatch, 'url');
    const stackNeedleDetails = safe.initPattern(extraArgs.stackToMatch || '', { canNegate: true });
    const logAll = rawPrunePaths === '';

    self.fetch = new Proxy(self.fetch, {
        apply: function(target, thisArg, args) {
            const fetchPromise = Reflect.apply(target, thisArg, args);
            // Extract request properties for matching
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
                return cloned.json().then(function(obj) {
                    if ( logAll ) {
                        safe.log_(logPrefix, 'Fetched JSON:', safe.JSON_stringify(obj).slice(0, 200));
                        return response;
                    }
                    const result = objectPruneFn(
                        obj,
                        rawPrunePaths,
                        rawNeedlePaths,
                        stackNeedleDetails,
                        extraArgs
                    );
                    if ( result !== undefined ) {
                        safe.log_(logPrefix, 'Pruned response');
                        const body = safe.JSON_stringify(result);
                        const headers = {};
                        for ( const [k, v] of response.headers.entries() ) {
                            headers[k] = v;
                        }
                        return new Response(body, {
                            status: response.status,
                            statusText: response.statusText,
                            headers,
                        });
                    }
                    return response;
                }).catch(function() {
                    return response;
                });
            });
        },
    });
}
