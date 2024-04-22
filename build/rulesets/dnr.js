
import {
    toJSONRuleset,
    isRegexSupported,
} from './utils.js';

export function generateDNR(ruleset) {

    let total = ruleset.length;

    // Remove rules with errors
    ruleset = ruleset.filter(rule => rule._error === undefined);

    // Remove unsupported regex rules
    ruleset = ruleset.filter((rule) => {
        if (rule.condition?.regexFilter !== undefined) {
            let { isSupported } = isRegexSupported({
                regex: rule.condition.regexFilter,
                isCaseSensitive: rule.condition.isUrlFilterCaseSensitive || false,
            });
            return isSupported;
        }
        return true;
    });

    // XXX: This should no longer be neccesary for chrome 118+
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/declarativeNetRequest/RuleCondition#browser_compatibility
    ruleset = ruleset.map((rule) => {
        if (rule.condition?.urlFilter || rule.condition?.regexFilter) {
            if ( rule.condition.isUrlFilterCaseSensitive === undefined ) {
                rule.condition.isUrlFilterCaseSensitive = false;
            } else if ( rule.condition.isUrlFilterCaseSensitive === true ) {
                rule.condition.isUrlFilterCaseSensitive = undefined;
            }
        }
        return rule;
    });

    let plain = ruleset.length;

    return {
        stats: {
            total,
            plain,
        },
        src: toJSONRuleset(ruleset),
    }
}