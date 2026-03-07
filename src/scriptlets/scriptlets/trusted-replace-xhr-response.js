export default {
    name: 'trusted-replace-xhr-response.js',
    requiresTrust: true,
    fn: trustedReplaceXhrResponse,
    dependencies: [
        'match-object-properties.fn',
        'parse-properties-to-match.fn',
        'safe-self.fn',
    ],
};

function trustedReplaceXhrResponse(pattern = '', replacement = '', propsToMatch = '') {
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('trusted-replace-xhr-response', pattern, replacement, propsToMatch);
    const extraArgs = safe.getExtraArgs(Array.from(arguments), 3);
    const logAll = pattern === '' && replacement === '';

    const parsedProps = parsePropertiesToMatch(propsToMatch, 'url');
    const patternRe = safe.patternToRegex(pattern, 'gms');

    // Process replacement: support includes directive
    let processedReplacement = replacement;
    if ( extraArgs.includes ) {
        // includes is handled externally; just pass through
    }

    const xhrOpen = XMLHttpRequest.prototype.open;

    XMLHttpRequest.prototype.open = new Proxy(xhrOpen, {
        apply: function(target, thisArg, args) {
            const method = String(args[0] || '');
            const url = String(args[1] || '');

            const xhrDetails = { method, url };

            if ( logAll ) {
                safe.log_(logPrefix, 'xhr:', method, url);
            } else if ( matchObjectProperties(parsedProps, xhrDetails) ) {
                thisArg._trustedReplaceXhrMatch = true;
            }

            return Reflect.apply(target, thisArg, args);
        },
    });

    const responseGet = Object.getOwnPropertyDescriptor(
        XMLHttpRequest.prototype, 'response'
    );
    const responseTextGet = Object.getOwnPropertyDescriptor(
        XMLHttpRequest.prototype, 'responseText'
    );

    const replaceText = function(text) {
        if ( typeof text !== 'string' ) { return text; }
        patternRe.lastIndex = 0;
        const result = text.replace(patternRe, processedReplacement);
        if ( result !== text ) {
            safe.log_(logPrefix, 'Replaced in XHR response');
        }
        return result;
    };

    if ( responseTextGet && responseTextGet.get ) {
        Object.defineProperty(XMLHttpRequest.prototype, 'responseText', {
            get: function() {
                const text = responseTextGet.get.call(this);
                if ( !this._trustedReplaceXhrMatch ) { return text; }
                if ( this._trustedReplacedText !== undefined ) {
                    return this._trustedReplacedText;
                }
                this._trustedReplacedText = replaceText(text);
                return this._trustedReplacedText;
            },
            configurable: true,
        });
    }

    if ( responseGet && responseGet.get ) {
        Object.defineProperty(XMLHttpRequest.prototype, 'response', {
            get: function() {
                if ( !this._trustedReplaceXhrMatch ) {
                    return responseGet.get.call(this);
                }
                const rType = this.responseType;
                if ( rType === '' || rType === 'text' ) {
                    const text = responseTextGet
                        ? responseTextGet.get.call(this)
                        : responseGet.get.call(this);
                    if ( this._trustedReplacedResponse !== undefined ) {
                        return this._trustedReplacedResponse;
                    }
                    this._trustedReplacedResponse = replaceText(text);
                    return this._trustedReplacedResponse;
                }
                return responseGet.get.call(this);
            },
            configurable: true,
        });
    }
}
