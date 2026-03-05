/*******************************************************************************
    CtrlBlk - MV3 content blocker
    DNR ruleset management.
*/

import { browser, dnr, i18n } from './browser-api.js';
import { fetchJSON } from './fetch-json.js';
import { ubolLog } from './hostname-utils.js';

const RULE_REALM_SIZE = 1000000;
const REGEXES_REALM_START = 1000000;
const REGEXES_REALM_END = REGEXES_REALM_START + RULE_REALM_SIZE;
const REMOVEPARAMS_REALM_START = REGEXES_REALM_END;
const REMOVEPARAMS_REALM_END = REMOVEPARAMS_REALM_START + RULE_REALM_SIZE;
const REDIRECT_REALM_START = REMOVEPARAMS_REALM_END;
const REDIRECT_REALM_END = REDIRECT_REALM_START + RULE_REALM_SIZE;
const MODIFYHEADERS_REALM_START = REDIRECT_REALM_END;
const MODIFYHEADERS_REALM_END = MODIFYHEADERS_REALM_START + RULE_REALM_SIZE;
const TRUSTED_DIRECTIVE_BASE_RULE_ID = 8000000;

function getRulesetDetails() {
    if ( getRulesetDetails.promise !== undefined ) {
        return getRulesetDetails.promise;
    }
    getRulesetDetails.promise = fetchJSON('/rulesets/ruleset-details').then(entries => {
        return new Map(entries.map(entry => [ entry.id, entry ]));
    });
    return getRulesetDetails.promise;
}

function getDynamicRules() {
    if ( getDynamicRules.promise !== undefined ) {
        return getDynamicRules.promise;
    }
    getDynamicRules.promise = dnr.getDynamicRules().then(rules => {
        const rulesMap = new Map(rules.map(rule => [ rule.id, rule ]));
        ubolLog(`Dynamic rule count: ${rulesMap.size}`);
        ubolLog(`Available dynamic rule count: ${dnr.MAX_NUMBER_OF_DYNAMIC_AND_SESSION_RULES - rulesMap.size}`);
        return rulesMap;
    });
    return getDynamicRules.promise;
}

async function pruneInvalidRegexRules(realm, rulesIn) {
    const dynamicRules = await dnr.getDynamicRules();
    const validRegexSet = new Set(
        dynamicRules.filter(rule =>
            rule.condition?.regexFilter && true || false
        ).map(rule =>
            rule.condition.regexFilter
        )
    );

    const toCheck = [];
    const rejectedRegexRules = [];
    for ( const rule of rulesIn ) {
        if ( rule.condition?.regexFilter === undefined ) {
            toCheck.push(true);
            continue;
        }
        const {
            regexFilter: regex,
            isUrlFilterCaseSensitive: isCaseSensitive
        } = rule.condition;
        if ( validRegexSet.has(regex) ) {
            toCheck.push(true);
            continue;
        }
        toCheck.push(
            dnr.isRegexSupported({ regex, isCaseSensitive }).then(result => {
                if ( result.isSupported ) { return true; }
                rejectedRegexRules.push(`\t${regex}  ${result.reason}`);
                return false;
            })
        );
    }

    const isValid = await Promise.all(toCheck);

    if ( rejectedRegexRules.length !== 0 ) {
        ubolLog(
            `${realm} realm: rejected regexes:\n`,
            rejectedRegexRules.join('\n')
        );
    }

    return rulesIn.filter((v, i) => isValid[i]);
}

async function updateRealmRules(realmStart, realmEnd, realmName, ruleKey, fetchSubpath, requireOmnipotence) {
    const promises = [
        getEnabledRulesetsDetails(),
        getDynamicRules(),
    ];
    if ( requireOmnipotence ) {
        promises.push(browser.permissions.contains({ origins: [ '<all_urls>' ] }));
    }
    const results = await Promise.all(promises);
    const rulesetDetails = results[0];
    const dynamicRuleMap = results[1];
    const hasOmnipotence = requireOmnipotence ? results[2] : true;

    const toFetch = [];
    for ( const details of rulesetDetails ) {
        if ( details.rules[ruleKey] === 0 ) { continue; }
        toFetch.push(fetchJSON(`/rulesets/${fetchSubpath}/${details.id}`));
    }
    const fetchedRulesets = await Promise.all(toFetch);

    const allRules = [];
    if ( hasOmnipotence ) {
        let ruleId = realmStart;
        for ( const rules of fetchedRulesets ) {
            if ( Array.isArray(rules) === false ) { continue; }
            for ( const rule of rules ) {
                rule.id = ruleId++;
                allRules.push(rule);
            }
        }
    }

    const validatedRules = await pruneInvalidRegexRules(realmName, allRules);

    const newRuleMap = new Map(validatedRules.map(rule => [ rule.id, rule ]));
    const addRules = [];
    const removeRuleIds = [];

    for ( const oldRule of dynamicRuleMap.values() ) {
        if ( oldRule.id < realmStart ) { continue; }
        if ( oldRule.id >= realmEnd ) { continue; }
        const newRule = newRuleMap.get(oldRule.id);
        if ( newRule === undefined ) {
            removeRuleIds.push(oldRule.id);
            dynamicRuleMap.delete(oldRule.id);
        } else if ( JSON.stringify(oldRule) !== JSON.stringify(newRule) ) {
            removeRuleIds.push(oldRule.id);
            addRules.push(newRule);
            dynamicRuleMap.set(oldRule.id, newRule);
        }
    }

    for ( const newRule of newRuleMap.values() ) {
        if ( dynamicRuleMap.has(newRule.id) ) { continue; }
        addRules.push(newRule);
        dynamicRuleMap.set(newRule.id, newRule);
    }

    if ( addRules.length === 0 && removeRuleIds.length === 0 ) { return; }

    if ( removeRuleIds.length !== 0 ) {
        ubolLog(`Remove ${removeRuleIds.length} DNR ${realmName} rules`);
    }
    if ( addRules.length !== 0 ) {
        ubolLog(`Add ${addRules.length} DNR ${realmName} rules`);
    }

    return dnr.updateDynamicRules({ addRules, removeRuleIds }).catch(reason => {
        console.error(`update${realmName}Rules() / ${reason}`);
    });
}

function updateRegexRules() {
    return updateRealmRules(REGEXES_REALM_START, REGEXES_REALM_END, 'regex', 'regex', 'regex', false);
}

function updateRemoveparamRules() {
    return updateRealmRules(REMOVEPARAMS_REALM_START, REMOVEPARAMS_REALM_END, 'removeparam', 'removeparam', 'removeparam', true);
}

function updateRedirectRules() {
    return updateRealmRules(REDIRECT_REALM_START, REDIRECT_REALM_END, 'redirect', 'redirect', 'redirect', true);
}

function updateModifyHeadersRules() {
    return updateRealmRules(MODIFYHEADERS_REALM_START, MODIFYHEADERS_REALM_END, 'modifyHeaders', 'modifyHeaders', 'modify-headers', true);
}

async function updateDynamicRules() {
    return Promise.all([
        updateRegexRules(),
        updateRemoveparamRules(),
        updateRedirectRules(),
        updateModifyHeadersRules(),
    ]);
}

async function defaultRulesetsFromLanguage() {
    const out = [ 'default' ];

    const dropCountry = lang => {
        const pos = lang.indexOf('-');
        if ( pos === -1 ) { return lang; }
        return lang.slice(0, pos);
    };

    const langSet = new Set();
    for ( const lang of navigator.languages.map(dropCountry) ) {
        langSet.add(lang);
    }
    langSet.add(dropCountry(i18n.getUILanguage()));

    const reTargetLang = new RegExp(
        `\\b(${Array.from(langSet).join('|')})\\b`
    );

    const rulesetDetails = await getRulesetDetails();
    for ( const [ id, details ] of rulesetDetails ) {
        if ( typeof details.lang !== 'string' ) { continue; }
        if ( reTargetLang.test(details.lang) === false ) { continue; }
        out.push(id);
    }
    return out;
}

async function enableRulesets(ids) {
    const afterIds = new Set(ids);
    const beforeIds = new Set(await dnr.getEnabledRulesets());
    const enableRulesetSet = new Set();
    const disableRulesetSet = new Set();
    for ( const id of afterIds ) {
        if ( beforeIds.has(id) ) { continue; }
        enableRulesetSet.add(id);
    }
    for ( const id of beforeIds ) {
        if ( afterIds.has(id) ) { continue; }
        disableRulesetSet.add(id);
    }

    if ( enableRulesetSet.size === 0 && disableRulesetSet.size === 0 ) {
        return;
    }

    const rulesetDetails = await getRulesetDetails();
    for ( const id of enableRulesetSet ) {
        if ( rulesetDetails.has(id) ) { continue; }
        enableRulesetSet.delete(id);
    }
    for ( const id of disableRulesetSet ) {
        if ( rulesetDetails.has(id) ) { continue; }
        disableRulesetSet.delete(id);
    }
    const enableRulesetIds = Array.from(enableRulesetSet);
    const disableRulesetIds = Array.from(disableRulesetSet);

    if ( enableRulesetIds.length !== 0 ) {
        ubolLog(`Enable rulesets: ${enableRulesetIds}`);
    }
    if ( disableRulesetIds.length !== 0 ) {
        ubolLog(`Disable ruleset: ${disableRulesetIds}`);
    }
    await dnr.updateEnabledRulesets({ enableRulesetIds, disableRulesetIds });

    return updateDynamicRules();
}

async function getEnabledRulesetsDetails() {
    const [
        ids,
        rulesetDetails,
    ] = await Promise.all([
        dnr.getEnabledRulesets(),
        getRulesetDetails(),
    ]);
    const out = [];
    for ( const id of ids ) {
        const ruleset = rulesetDetails.get(id);
        if ( ruleset === undefined ) { continue; }
        out.push(ruleset);
    }
    return out;
}

export {
    TRUSTED_DIRECTIVE_BASE_RULE_ID,
    getRulesetDetails,
    getDynamicRules,
    enableRulesets,
    defaultRulesetsFromLanguage,
    getEnabledRulesetsDetails,
    updateDynamicRules,
};
