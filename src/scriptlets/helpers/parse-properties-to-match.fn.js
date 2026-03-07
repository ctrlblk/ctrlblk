export default {
    name: 'parse-properties-to-match.fn',
    fn: parsePropertiesToMatch,
    dependencies: [
        'safe-self.fn',
    ],
};

function parsePropertiesToMatch(propsToMatch, implicit = '') {
    const safe = safeSelf();
    const needles = new Map();
    if ( propsToMatch === '' || propsToMatch === undefined ) {
        return needles;
    }
    const pairs = propsToMatch.split(/\s+/);
    for ( const pair of pairs ) {
        let prop, rawPattern;
        // If the pair is a regex pattern (starts and ends with /), treat it
        // as a bare pattern with the implicit property. This avoids splitting
        // on colons that appear inside regex groups like (?:...).
        if ( /^\/(.+)\/([gimsu]*)$/.test(pair) ) {
            prop = implicit;
            rawPattern = pair;
        } else {
            const colonIdx = pair.indexOf(':');
            if ( colonIdx === -1 ) {
                prop = implicit;
                rawPattern = pair;
            } else {
                prop = pair.slice(0, colonIdx);
                rawPattern = pair.slice(colonIdx + 1);
            }
        }
        if ( prop === '' ) { continue; }
        needles.set(prop, safe.initPattern(rawPattern, { canNegate: true }));
    }
    return needles;
}
