export default {
    name: 'json-prune-xhr-response.js',
    fn: jsonPruneXhrResponse,
    dependencies: ['match-object-properties.fn', 'object-prune.fn', 'parse-properties-to-match.fn', 'safe-self.fn'],
};

function jsonPruneXhrResponse(rawPrunePaths = '', rawNeedlePaths = '') {
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('json-prune-xhr-response', rawPrunePaths, rawNeedlePaths);
    const extraArgs = safe.getExtraArgs(Array.from(arguments), 2);
    const propNeedles = parsePropertiesToMatch(extraArgs.propsToMatch, 'url');
    const stackNeedleDetails = safe.initPattern(extraArgs.stackToMatch || '', { canNegate: true });
    const logAll = rawPrunePaths === '';
    const XHR = safe.XMLHttpRequest;
    self.XMLHttpRequest = class extends XHR {
        #shouldPrune = false;
        open(method, url, ...rest) {
            this.#shouldPrune = false;
            if ( propNeedles.size === 0 || matchObjectProperties(propNeedles, { method, url: url.toString() }) ) {
                this.#shouldPrune = true;
            }
            return super.open(method, url, ...rest);
        }
        get response() {
            const response = super.response;
            if ( this.#shouldPrune !== true ) { return response; }
            if ( typeof response !== 'string' && typeof response !== 'object' ) {
                return response;
            }
            let obj;
            try {
                obj = typeof response === 'string'
                    ? safe.JSON_parse(response)
                    : response;
            } catch (e) {
                return response;
            }
            if ( obj instanceof Object === false ) { return response; }
            if ( logAll ) {
                safe.log_(logPrefix, safe.JSON_stringify(obj, null, 2));
                return response;
            }
            objectPruneFn(obj, rawPrunePaths, rawNeedlePaths, stackNeedleDetails, extraArgs);
            return typeof response === 'string'
                ? safe.JSON_stringify(obj)
                : obj;
        }
        get responseText() {
            const text = super.responseText;
            if ( this.#shouldPrune !== true ) { return text; }
            let obj;
            try {
                obj = safe.JSON_parse(text);
            } catch (e) {
                return text;
            }
            if ( obj instanceof Object === false ) { return text; }
            if ( logAll ) {
                safe.log_(logPrefix, safe.JSON_stringify(obj, null, 2));
                return text;
            }
            objectPruneFn(obj, rawPrunePaths, rawNeedlePaths, stackNeedleDetails, extraArgs);
            return safe.JSON_stringify(obj);
        }
    };
}
