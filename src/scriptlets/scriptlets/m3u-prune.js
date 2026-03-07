export default {
    name: 'm3u-prune.js',
    fn: m3uPrune,
    dependencies: ['safe-self.fn'],
};

function m3uPrune(m3uPattern = '', urlPattern = '') {
    if ( m3uPattern === '' ) { return; }
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('m3u-prune', m3uPattern, urlPattern);
    const urlDetails = safe.initPattern(urlPattern);

    const isRegex = /^\/(.+)\/(g?i?m?s?)$/.test(m3uPattern);
    let reMultiline = null;

    if ( isRegex ) {
        const reMatch = /^\/(.+)\/(g?i?m?s?)$/.exec(m3uPattern);
        try {
            reMultiline = new RegExp(reMatch[1], reMatch[2] || 'gms');
        } catch(ex) {
            return;
        }
    }

    const pruneM3U = function(text) {
        if ( typeof text !== 'string' ) { return text; }
        if ( text.startsWith('#EXTM3U') === false ) { return text; }

        if ( reMultiline ) {
            const pruned = text.replace(reMultiline, '');
            if ( pruned !== text ) {
                safe.log_(logPrefix, 'Pruned via regex');
            }
            return pruned;
        }

        // Convert wildcard pattern to regex
        const patternStr = safe.escapeRegexChars(m3uPattern).replace(/\\\*/g, '.*?');
        const patternRe = new RegExp(patternStr);

        const lines = text.split('\n');
        const outLines = [];
        let i = 0;

        while ( i < lines.length ) {
            const line = lines[i];

            // Handle #EXT-X-SPLICEOUT blocks
            if ( /^#EXT-X-CUE-OUT/.test(line) && patternRe.test(line) ) {
                // Skip until CUE-IN
                while ( i < lines.length ) {
                    if ( /^#EXT-X-CUE-IN/.test(lines[i]) ) {
                        i++;
                        break;
                    }
                    i++;
                }
                safe.log_(logPrefix, 'Pruned splice-out block');
                continue;
            }

            // Handle EXTINF entries: if current line is EXTINF, check next URL line
            if ( line.startsWith('#EXTINF') ) {
                // Gather all tag lines following EXTINF until the URL line
                const tagLines = [line];
                let j = i + 1;
                while ( j < lines.length && lines[j].startsWith('#') ) {
                    tagLines.push(lines[j]);
                    j++;
                }
                const urlLine = j < lines.length ? lines[j] : '';
                const combined = tagLines.join('\n') + '\n' + urlLine;
                if ( patternRe.test(combined) ) {
                    // Skip this EXTINF block
                    i = j + 1;
                    safe.log_(logPrefix, 'Pruned EXTINF block');
                    continue;
                }
            }

            // Check standalone lines (non-EXTINF tags like EXT-X-DATERANGE, etc.)
            if ( line.startsWith('#') && !line.startsWith('#EXTINF') && !line.startsWith('#EXTM3U') ) {
                if ( patternRe.test(line) ) {
                    i++;
                    safe.log_(logPrefix, 'Pruned line:', line.slice(0, 80));
                    continue;
                }
            }

            outLines.push(line);
            i++;
        }

        return outLines.join('\n');
    };

    // Proxy fetch
    self.fetch = new Proxy(self.fetch, {
        apply: function(target, thisArg, args) {
            const url = args[0] instanceof Request ? args[0].url : String(args[0]);
            if ( safe.testPattern(urlDetails, url) === false ) {
                return Reflect.apply(target, thisArg, args);
            }
            return Reflect.apply(target, thisArg, args).then(function(response) {
                return response.text().then(function(text) {
                    const pruned = pruneM3U(text);
                    return new Response(pruned, {
                        status: response.status,
                        statusText: response.statusText,
                        headers: response.headers,
                    });
                });
            });
        },
    });

    // Proxy XMLHttpRequest
    const xhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = new Proxy(xhrOpen, {
        apply: function(target, thisArg, args) {
            const url = String(args[1] || '');
            if ( safe.testPattern(urlDetails, url) ) {
                thisArg._m3uPruneMatch = true;
            }
            return Reflect.apply(target, thisArg, args);
        },
    });

    const xhrResponseTextGet = Object.getOwnPropertyDescriptor(
        XMLHttpRequest.prototype, 'responseText'
    );
    const xhrResponseGet = Object.getOwnPropertyDescriptor(
        XMLHttpRequest.prototype, 'response'
    );

    if ( xhrResponseTextGet && xhrResponseTextGet.get ) {
        Object.defineProperty(XMLHttpRequest.prototype, 'responseText', {
            get: function() {
                const text = xhrResponseTextGet.get.call(this);
                if ( !this._m3uPruneMatch ) { return text; }
                if ( this._m3uPrunedText !== undefined ) { return this._m3uPrunedText; }
                this._m3uPrunedText = pruneM3U(text);
                return this._m3uPrunedText;
            },
            configurable: true,
        });
    }

    if ( xhrResponseGet && xhrResponseGet.get ) {
        Object.defineProperty(XMLHttpRequest.prototype, 'response', {
            get: function() {
                if ( !this._m3uPruneMatch ) {
                    return xhrResponseGet.get.call(this);
                }
                const rType = this.responseType;
                if ( rType === '' || rType === 'text' ) {
                    const text = xhrResponseTextGet
                        ? xhrResponseTextGet.get.call(this)
                        : xhrResponseGet.get.call(this);
                    if ( this._m3uPrunedResponse !== undefined ) {
                        return this._m3uPrunedResponse;
                    }
                    this._m3uPrunedResponse = pruneM3U(text);
                    return this._m3uPrunedResponse;
                }
                return xhrResponseGet.get.call(this);
            },
            configurable: true,
        });
    }
}
