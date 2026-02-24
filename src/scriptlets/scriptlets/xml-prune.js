export default {
    name: 'xml-prune.js',
    fn: xmlPrune,
    dependencies: ['safe-self.fn'],
};

function xmlPrune(selector = '', selectorCheck = '', urlPattern = '') {
    if ( selector === '' ) { return; }
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('xml-prune', selector, selectorCheck, urlPattern);
    const extraArgs = safe.getExtraArgs(Array.from(arguments), 3);
    const urlDetails = safe.initPattern(urlPattern);
    const checkDetails = safe.initPattern(selectorCheck);

    const isXPath = selector.startsWith('xpath(') && selector.endsWith(')');
    const xpathExpr = isXPath ? selector.slice(6, -1) : '';

    const pruneFromDoc = function(xmlDoc) {
        if ( isXPath ) {
            const xpe = new XPathEvaluator();
            const result = xpe.evaluate(
                xpathExpr,
                xmlDoc,
                xmlDoc.createNSResolver(xmlDoc.documentElement),
                XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
                null
            );
            for ( let i = result.snapshotLength - 1; i >= 0; i-- ) {
                const node = result.snapshotItem(i);
                if ( node.parentNode ) {
                    node.parentNode.removeChild(node);
                }
            }
        } else {
            const nodes = xmlDoc.querySelectorAll(selector);
            for ( const node of nodes ) {
                if ( node.parentNode ) {
                    node.parentNode.removeChild(node);
                }
            }
        }
    };

    const shouldPrune = function(xmlDoc) {
        if ( checkDetails.matchAll ) { return true; }
        const serializer = new XMLSerializer();
        const text = serializer.serializeToString(xmlDoc);
        return safe.testPattern(checkDetails, text);
    };

    const pruneXML = function(text) {
        if ( typeof text !== 'string' || text.length === 0 ) { return text; }
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, 'text/xml');
            if ( xmlDoc.querySelector('parsererror') ) { return text; }
            if ( shouldPrune(xmlDoc) === false ) { return text; }
            pruneFromDoc(xmlDoc);
            const serializer = new XMLSerializer();
            const result = serializer.serializeToString(xmlDoc);
            safe.log_(logPrefix, 'Pruned XML');
            return result;
        } catch(ex) {
            return text;
        }
    };

    const entry = {
        testUrl: function(url) { return safe.testPattern(urlDetails, url); },
        pruneXML: pruneXML,
        pruneFromDoc: pruneFromDoc,
    };

    // Proxy fetch - wrap only once, accumulate entries
    if ( !scriptletGlobals.xmlPruneFetchEntries ) {
        scriptletGlobals.xmlPruneFetchEntries = [];
        self.fetch = new Proxy(self.fetch, {
            apply: function(target, thisArg, args) {
                const url = args[0] instanceof Request ? args[0].url : String(args[0]);
                const matching = scriptletGlobals.xmlPruneFetchEntries.filter(
                    function(e) { return e.testUrl(url); }
                );
                if ( matching.length === 0 ) {
                    return Reflect.apply(target, thisArg, args);
                }
                return Reflect.apply(target, thisArg, args).then(function(response) {
                    return response.text().then(function(text) {
                        let pruned = text;
                        for ( const e of matching ) {
                            pruned = e.pruneXML(pruned);
                        }
                        return new Response(pruned, {
                            status: response.status,
                            statusText: response.statusText,
                            headers: response.headers,
                        });
                    });
                });
            },
        });
    }
    scriptletGlobals.xmlPruneFetchEntries.push(entry);

    // Proxy XMLHttpRequest - wrap only once, accumulate entries
    if ( !scriptletGlobals.xmlPruneXhrEntries ) {
        scriptletGlobals.xmlPruneXhrEntries = [];
        const xhrOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = new Proxy(xhrOpen, {
            apply: function(target, thisArg, args) {
                const url = String(args[1] || '');
                const matching = [];
                for ( const e of scriptletGlobals.xmlPruneXhrEntries ) {
                    if ( e.testUrl(url) ) {
                        matching.push(e);
                    }
                }
                if ( matching.length > 0 ) {
                    thisArg._xmlPruneEntries = matching;
                }
                return Reflect.apply(target, thisArg, args);
            },
        });

        const xhrResponseGet = Object.getOwnPropertyDescriptor(
            XMLHttpRequest.prototype, 'response'
        );
        const xhrResponseTextGet = Object.getOwnPropertyDescriptor(
            XMLHttpRequest.prototype, 'responseText'
        );

        if ( xhrResponseTextGet && xhrResponseTextGet.get ) {
            Object.defineProperty(XMLHttpRequest.prototype, 'responseText', {
                get: function() {
                    const text = xhrResponseTextGet.get.call(this);
                    if ( !this._xmlPruneEntries ) { return text; }
                    if ( this._xmlPrunedText !== undefined ) { return this._xmlPrunedText; }
                    let result = text;
                    for ( const e of this._xmlPruneEntries ) {
                        result = e.pruneXML(result);
                    }
                    this._xmlPrunedText = result;
                    return this._xmlPrunedText;
                },
                configurable: true,
            });
        }

        if ( xhrResponseGet && xhrResponseGet.get ) {
            Object.defineProperty(XMLHttpRequest.prototype, 'response', {
                get: function() {
                    if ( !this._xmlPruneEntries ) {
                        return xhrResponseGet.get.call(this);
                    }
                    const rType = this.responseType;
                    if ( rType === '' || rType === 'text' ) {
                        const text = xhrResponseTextGet
                            ? xhrResponseTextGet.get.call(this)
                            : xhrResponseGet.get.call(this);
                        if ( this._xmlPrunedResponse !== undefined ) {
                            return this._xmlPrunedResponse;
                        }
                        let result = text;
                        for ( const e of this._xmlPruneEntries ) {
                            result = e.pruneXML(result);
                        }
                        this._xmlPrunedResponse = result;
                        return this._xmlPrunedResponse;
                    }
                    if ( rType === 'document' ) {
                        const doc = xhrResponseGet.get.call(this);
                        if ( doc instanceof Document ) {
                            for ( const e of this._xmlPruneEntries ) {
                                e.pruneFromDoc(doc);
                            }
                        }
                        return doc;
                    }
                    return xhrResponseGet.get.call(this);
                },
                configurable: true,
            });
        }
    }
    scriptletGlobals.xmlPruneXhrEntries.push(entry);
}
