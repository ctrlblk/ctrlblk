import { browser } from "/uBOLite/js/ext.js"

import { dnrRulesetFromRawLists } from '/uBOBits/static-dnr-filtering.js';
import redirectResourcesMap from '/uBOBits/redirect-resources.js';

export async function getRule(ruleId, rulesetId) {
    if (rulesetId === "_dynamic") {
        for (let rule of await browser.declarativeNetRequest.getDynamicRules()) {
            if (rule.id == ruleId) {
                return rule
            }
        }
    } else if (rulesetId === "_session") {
        for (let rule of await browser.declarativeNetRequest.getSessionRules()) {
            if (rule.id == ruleId) {
                return rule
            }
        }
    } else {
        let res = await fetch(`/rulesets/main/${rulesetId}.json`)
        let resJSON = await res.json()

        for (let rule of resJSON) {
            if (rule.id == ruleId) {
                return rule
            }
        }
    }
}

export async function getRules(options) {
    let { ruleIds, rulesetIds } = options || {}

    let rules = new Map()

    let res = await fetch("/rulesets/ruleset-details.json")
    let resJSON = await res.json()

    for (let { id } of resJSON) {
        if (rulesetIds === undefined || rulesetIds.includes(id) ) {
            let res = await fetch(`/rulesets/main/${id}.json`)
            let resJSON = await res.json()

            for (let rule of resJSON) {
                if (ruleIds === undefined || ruleIds.includes(rule.id)) {
                    rules.set(rule.id, rule)
                }
            }
        }
    }

    if (rulesetIds === undefined || rulesetIds.includes("_dynamic")) {
        for (let rule of await browser.declarativeNetRequest.getDynamicRules()) {
            if (ruleIds === undefined || ruleIds.includes(rule.id)) {
                rules.set(rule.id, rule)
            }
        }
    }
    if (rulesetIds === undefined || rulesetIds.includes("_session")) {
        for (let rule of await browser.declarativeNetRequest.getSessionRules()) {
            if (ruleIds === undefined || ruleIds.includes(rule.id)) {
                rules.set(rule.id, rule)
            }
        }
    }

    return rules
}

export async function getRulesNeo(filter) {
    // filter is either:
    // "rulesetId"
    // { rulesetId: "rulesetId" }
    // XXX: this should not also use rulesetId
    // { rulesetId: "rulesetId", ruleIds: [1,2,3] }
    let rulesetId = filter
    let ruleIds

    if (typeof rulesetId !== "string" && filter !== undefined) {
        rulesetId = filter?.rulesetId
        ruleIds = filter?.ruleIds

        if (rulesetId === undefined) {
            rulesetId = filter.rulesetId
        }
    }

    console.log("getRulesNeo", rulesetId, ruleIds, JSON.stringify(filter))

    let res = await fetch("/rulesets/ruleset-details.json")
    let resJSON = await res.json()

    let rulesetIds = resJSON.map((e) => (e.id))

    rulesetIds.push(browser.declarativeNetRequest.DYNAMIC_RULESET_ID)
    rulesetIds.push(browser.declarativeNetRequest.SESSION_RULESET_ID)

    if (rulesetId) {
        rulesetIds = rulesetIds.filter((e) => (e === rulesetId))
    }

    let result = new Map()

    for (let rulesetId of rulesetIds) {
        let rules
        if (rulesetId === browser.declarativeNetRequest.DYNAMIC_RULESET_ID) {
            let dymamicRules = await browser.declarativeNetRequest.getDynamicRules({ ruleIds })
            rules = new Map(dymamicRules.map((e) => ([ e.id, e])))
        } else if (rulesetId === browser.declarativeNetRequest.SESSION_RULESET_ID) {
            let sessionRules = await browser.declarativeNetRequest.getSessionRules({ ruleIds })
            rules = new Map(sessionRules.map((e) => ([ e.id, e])))
        } else {
            let res = await fetch(`/rulesets/main/${rulesetId}.json`)
            let resJSON = await res.json()

            if (ruleIds) {
                resJSON = resJSON.filter((e) => (ruleIds.includes(e.id)))
            }

            rules = new Map(resJSON.map((e) => ([ e.id, e])))
        }

        result.set(rulesetId, rules)
    }

    return result
}

export async function getRuleNeo({ rulesetId, ruleId }) {
    for (let [_, rules] of await getRulesNeo({ rulesetId, ruleIds: [ruleId] })) {
        for (let rule of rules.values()) {
            return rule
        }
    }
}

export async function getDisabledRules() {
    let enabledRulesetIds = await browser.declarativeNetRequest.getEnabledRulesets()

    let result = new Map()

    for (let rulesetId of enabledRulesetIds) {
        let disableRuleIds = await browser.declarativeNetRequest.getDisabledRuleIds({ rulesetId })

        if (disableRuleIds.length > 0) {
            let disabledRules = await getRulesNeo({ rulesetId: rulesetId, ruleIds: disableRuleIds })
            result.set(rulesetId, disabledRules.get(rulesetId))
        }
    }

    return result
}

export async function enableRules({ rulesetId, enableRuleIds }) {

    // XXX: handle if rulesetid isn't enabled or _session/_dynamic

    return await browser.declarativeNetRequest.updateStaticRules({ rulesetId, enableRuleIds })
}

export async function disableRules({ rulesetId, disableRuleIds }) {

    // XXX: handle if rulesetid isn't enabled or _session/_dynamic

    return await browser.declarativeNetRequest.updateStaticRules({ rulesetId, disableRuleIds })
}

export function ruleToFilter({ action, condition }, requestURL) {
    let parts = []

    if (action.type === "allow") {
        parts.push("@@")
    }

    if (condition.urlFilter) {
        parts.push(condition.urlFilter)
    }

    // NOTE: During DNR rule generation same filters for different domains are folded into
    // a single rule to reduce the total number of rules. This leads to rules with many, many
    // requestDomains which is not particular readable. Therefore we allow to pass either a
    // requestDomains so we can construct the original per domain rule or limit the number
    // of requestDomains to 10
    if (condition.requestDomains) {
        if (requestURL) {
            let requestURL_ = new URL(requestURL)
            for (let requestDomainURL of condition.requestDomains) {
                if (requestURL_.hostname.endsWith(requestDomainURL)) {
                    parts.push(`||${requestDomainURL}^`)
                }
            }
        } else {
    
            parts.push(`||${condition.requestDomains.slice(0, 10).join(',')}^`)
        }
    }

    let modifiers = []

    if (condition.resourceTypes) {
        modifiers.push(condition.resourceTypes.join(','))
    }

    if (condition.initiatorDomains) {
        modifiers.push(`domain=${condition.initiatorDomains.join('|')}`)
    }

    if (condition.domainType) {
        modifiers.push({
            thirdParty: "third-party",
        }[condition.domainType])
    }

    if (modifiers.length) {
        parts.push(`\$${modifiers.join(',')}`)
    }

    return parts.join("")
}

export async function parseRules(rules) {
    let lists = [{
        name: "Session Rules",
        text: rules
    }]

    // Build list of available web accesible resources
    const extensionPaths = [];
    for ( const [ fname, details ] of redirectResourcesMap ) {
        const path = `/web_accessible_resources/${fname}`;
        extensionPaths.push([ fname, path ]);
        if ( details.alias === undefined ) { continue; }
        if ( typeof details.alias === 'string' ) {
            extensionPaths.push([ details.alias, path ]);
            continue;
        }
        if ( Array.isArray(details.alias) === false ) { continue; }
        for ( const alias of details.alias ) {
            extensionPaths.push([ alias, path ]);
        }
    }

    const options = {
        env: [
            'chromium',
            'mv3',
            'ublock',
            'ubol',
            'user_stylesheet',
            'native_css_has'
        ],
        extensionPaths,
        //secret: ruleset.secret,
        good: new Set(),
        bad: new Set(),
        invalid: new Set(),
        filterCount: 0,
        acceptedFilterCount: 0,
        rejectedFilterCount: 0,
    }

    let results = await dnrRulesetFromRawLists(lists, options);

    return results
}

export function isStaticRuleset(rulesetId) {
    return ![
        browser.declarativeNetRequest.DYNAMIC_RULESET_ID,
        browser.declarativeNetRequest.SESSION_RULESET_ID,
    ].includes(rulesetId)
}

export default {
    getRule,
    getRules,
    getRulesNeo,
    getRuleNeo,
    getDisabledRules,
    enableRules,
    disableRules,
    ruleToFilter,
    parseRules,
    isStaticRuleset,
}