export default {
    name: 'prevent-fetch.js',
    aliases: ['no-fetch-if.js'],
    fn: noFetchIf,
    dependencies: ['generate-content.fn', 'safe-self.fn'],
};

function noFetchIf(propsToMatch = '', responseBody = '', responseType = '') {
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('prevent-fetch', propsToMatch, responseBody, responseType);
    const logAll = propsToMatch === '' && responseBody === '';
    const needles = new Map();
    if ( propsToMatch !== '' ) {
        for ( const item of propsToMatch.split(/\s+/) ) {
            const separatorPos = item.indexOf(':');
            if ( separatorPos === -1 ) {
                needles.set('url', safe.patternToRegex(item));
            } else {
                const key = item.slice(0, separatorPos);
                const value = item.slice(separatorPos + 1);
                needles.set(key, safe.patternToRegex(value));
            }
        }
    }
    let responseOptions = {};
    if ( responseType !== '' ) {
        try {
            responseOptions = safe.JSON_parse(responseType);
        } catch (e) {
            responseOptions = {};
        }
    }
    self.fetch = new Proxy(self.fetch, {
        apply: function(target, thisArg, args) {
            const request = args[0];
            const init = args[1] || {};
            let url, method;
            if ( request instanceof Request ) {
                url = request.url;
                method = request.method;
            } else {
                url = String(request);
                method = init.method || 'GET';
            }
            const props = {
                url,
                method,
                body: typeof init.body === 'string' ? init.body : '',
            };
            if ( logAll ) {
                safe.log_(logPrefix, safe.JSON_stringify(props, null, 2));
                return Reflect.apply(target, thisArg, args);
            }
            let matched = true;
            for ( const [ key, re ] of needles ) {
                const value = props[key] !== undefined ? String(props[key]) : '';
                if ( safe.RegExp_test.call(re, value) === false ) {
                    matched = false;
                    break;
                }
            }
            if ( matched === false ) {
                return Reflect.apply(target, thisArg, args);
            }
            safe.log_(logPrefix, `Prevented: ${url}`);
            return generateContentFn(responseBody || 'emptyStr').then(function(text) {
                const responseInit = {
                    status: responseOptions.ok === false ? 403 : 200,
                    statusText: responseOptions.statusText || (responseOptions.ok === false ? 'Forbidden' : 'OK'),
                    headers: responseOptions.type === 'opaque'
                        ? undefined
                        : { 'Content-Type': 'text/plain' },
                };
                return new Response(text, responseInit);
            });
        },
    });
}
