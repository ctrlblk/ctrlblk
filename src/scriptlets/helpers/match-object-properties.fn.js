export default {
    name: 'match-object-properties.fn',
    fn: matchObjectProperties,
    dependencies: [
        'safe-self.fn',
    ],
};

function matchObjectProperties(propNeedles, ...objs) {
    if ( propNeedles.size === 0 ) { return true; }
    const safe = safeSelf();
    const merged = {};
    for ( const obj of objs ) {
        if ( obj instanceof Object === false ) { continue; }
        for ( const [key, value] of Object.entries(obj) ) {
            merged[key] = value;
        }
    }
    for ( const [prop, details] of propNeedles ) {
        let haystack = merged[prop];
        if ( haystack === undefined ) { return false; }
        if ( typeof haystack !== 'string' ) {
            try {
                haystack = safe.JSON_stringify(haystack);
            } catch(ex) {
                haystack = String(haystack);
            }
        }
        if ( safe.testPattern(details, haystack) === false ) {
            return false;
        }
    }
    return true;
}
