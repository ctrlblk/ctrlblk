import path from 'path';
import fs from 'fs/promises';

// Format ruleset for readability: one rule per line, all keys & arrays sorted
export function toJSONRuleset(ruleset) {
    const replacer = (k, v) => {
        if ( k.startsWith('_') ) { return; }
        if ( Array.isArray(v) ) {
            return v.sort();
        }
        if ( v instanceof Object ) {
            const sorted = {};
            for ( const kk of Object.keys(v).sort() ) {
                sorted[kk] = v[kk];
            }
            return sorted;
        }
        return v;
    };
    const out = [];
    for ( const rule of ruleset ) {
        out.push(JSON.stringify(rule, replacer));
    }
    return `[\n${out.join(',\n')}\n]\n`;
}

// Helper function that writes data to a given filename
// that creates any directories needed if neccesary
export async function writeFile(fname, data) {
    const dir = path.dirname(fname);
    await fs.mkdir(dir, { recursive: true });
    return await fs.writeFile(fname, data);
};

// Helper function prepares on object before it's JSON formatted into a scriptlet
export function scriptletJsonReplacer(k, v) {
    if ( k === 'n' ) {
        if ( v === undefined || v.size === 0 ) { return; }
        return Array.from(v);
    }
    if ( v instanceof Set || v instanceof Map ) {
        if ( v.size === 0 ) { return; }
        return Array.from(v);
    }
    return v;
};

// Approximation of declarativeNetRequest.isRegexSupported
// Filters out unsupported regex rules that would throw a warning when loaded in Chrome
// Based on: https://github.com/AdguardTeam/tsurlfilter/blob/2e865cd750d684590fc2ee0b9874dbbabd3aa5bd/packages/tsurlfilter/src/rules/declarative-converter/grouped-rules-converters/abstract-rule-converter.ts#L629
// NOTE: We use AdGuards approach since uBO loads all regex rules at runtime and is able to
// leverage the real isRegexSupported function provided by the browser. We are not since we
// aim to load all rules statically
export function isRegexSupported({ regex, isCaseSensitive, requireCapturing}) {
    if (regex !== (new RegExp(regex).toString())) {
        return {
            isSupported: false,
            reason: 'syntaxError',
        }
    }

    if (regex.match(/\|/g)) {
        const regexArr = regex.split('|');
        // TODO: Find how exactly the complexity of a rule is calculated.
        // The values maxGroups & maxGroupLength are obtained by testing.
        // TODO: Fix these values based on Chrome Errors
        const maxGroups = 15;
        const maxGroupLength = 31;
        if (regexArr.length > maxGroups || regexArr.some((i) => i.length > maxGroupLength)) {
            return {
                isSupported: false,
                reason: 'Too many or to large groups',
            }

        }
    }

    // Back reference, possessive and negative lookahead are not supported
    // See more: https://github.com/google/re2/wiki/Syntax
    if (regex?.match(/\\[1-9]|\(\?<?(!|=)|{\S+}/g)) {
        return {
            isSupported: false,
            reason: 'Unsupported regex syntax',
        }
    }

    return {
        isSupported: true
    }
}