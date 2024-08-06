
import { browser } from "/uBOLite/js/ext.js"

export async function getRule(ruleId, rulesetId) {
    if (rulesetId === "_dynamic") {
        for (let rule of await browser.declarativeNetRequest.getDynamicRules()) {
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

export async function getRules({ ruleIds, rulesetIds }) {
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

    return rules
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
        if (requestDomain) {
            let requestDomainURL = new URL(requestDomain)
            for (let requestDomainURL of condition.requestDomains) {
                if (requestURL.hostname.endsWith(requestDomain)) {
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

export default {
    getRule,
    getRules,
    ruleToFilter,
}
