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

export async function getRules() {
    let rules = new Map()

    let res = await fetch("/rulesets/ruleset-details.json")
    let resJSON = await res.json()

    for (let { id } of resJSON) {
        let res = await fetch(`/rulesets/main/${id}.json`)
        let resJSON = await res.json()

        for (let rule of resJSON) {
            rules.set(rule.id, rule)
        }
    }

    for (let rule of await browser.declarativeNetRequest.getDynamicRules()) {
        rules.set(rule.id, rule)
    }

    return rules
}

export function ruleToFilter({ action, condition }, requestURL) {
    requestURL = new URL(requestURL)

    let parts = []

    if (action.type === "allow") {
        parts.push("@@")
    }

    if (condition.urlFilter) {
        parts.push(condition.urlFilter)
    }

    for (let requestDomain of condition.requestDomains || []) {
        if (requestURL.hostname.endsWith(requestDomain)) {
            parts.push(`||${requestDomain}^`)
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
