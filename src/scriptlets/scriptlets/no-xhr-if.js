export default {
    name: 'no-xhr-if.js',
    aliases: ['prevent-xhr.js'],
    fn: noXhrIf,
    dependencies: ['generate-content.fn', 'match-object-properties.fn', 'parse-properties-to-match.fn', 'safe-self.fn'],
};

function noXhrIf(propsToMatch = '', directive = '') {
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('no-xhr-if', propsToMatch, directive);
    const propNeedles = parsePropertiesToMatch(propsToMatch, 'url');
    const logAll = propsToMatch === '' && directive === '';
    const XHR = safe.XMLHttpRequest;
    self.XMLHttpRequest = class extends XHR {
        #blocked = false;
        #method = '';
        #url = '';
        #responseType = '';
        open(method, url, ...rest) {
            this.#method = method;
            this.#url = url !== undefined ? String(url) : '';
            this.#blocked = false;
            const props = { method: this.#method, url: this.#url };
            if ( logAll ) {
                safe.log_(logPrefix, safe.JSON_stringify(props, null, 2));
            } else if ( matchObjectProperties(propNeedles, props) ) {
                this.#blocked = true;
                safe.log_(logPrefix, `Blocked: ${this.#url}`);
            }
            if ( this.#blocked === false ) {
                return super.open(method, url, ...rest);
            }
        }
        send(...args) {
            if ( this.#blocked === false ) {
                return super.send(...args);
            }
            this.#responseType = this.responseType;
            const self2 = this;
            generateContentFn(directive || 'emptyStr').then(function(text) {
                safe.Object_defineProperty(self2, 'readyState', { value: 4, writable: false });
                safe.Object_defineProperty(self2, 'status', { value: 200, writable: false });
                safe.Object_defineProperty(self2, 'statusText', { value: 'OK', writable: false });
                const buildResponse = function(text) {
                    const rt = self2.#responseType;
                    if ( rt === '' || rt === 'text' ) {
                        safe.Object_defineProperty(self2, 'responseText', { value: text, writable: false });
                        safe.Object_defineProperty(self2, 'response', { value: text, writable: false });
                    } else if ( rt === 'json' ) {
                        try {
                            const obj = safe.JSON_parse(text);
                            safe.Object_defineProperty(self2, 'response', { value: obj, writable: false });
                        } catch (e) {
                            safe.Object_defineProperty(self2, 'response', { value: null, writable: false });
                        }
                    } else if ( rt === 'arraybuffer' ) {
                        const encoder = new TextEncoder();
                        const buf = encoder.encode(text).buffer;
                        safe.Object_defineProperty(self2, 'response', { value: buf, writable: false });
                    } else if ( rt === 'blob' ) {
                        const blob = new Blob([text]);
                        safe.Object_defineProperty(self2, 'response', { value: blob, writable: false });
                    } else if ( rt === 'document' ) {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(text, 'text/html');
                        safe.Object_defineProperty(self2, 'response', { value: doc, writable: false });
                        safe.Object_defineProperty(self2, 'responseXML', { value: doc, writable: false });
                    } else {
                        safe.Object_defineProperty(self2, 'response', { value: text, writable: false });
                    }
                };
                buildResponse(text);
                self2.dispatchEvent(new Event('readystatechange'));
                self2.dispatchEvent(new Event('load'));
                self2.dispatchEvent(new Event('loadend'));
            });
        }
    };
}
