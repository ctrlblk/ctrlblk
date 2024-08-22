<script>
    import { onMount } from 'svelte'

    import {
        Button,
        Textarea,
    } from 'flowbite-svelte'

    import { browser } from '/uBOLite/js/ext.js'

    import {
        parseRules,
        ruleToFilter,
    } from '/src/js/rules.js'

    import {
        splitSpecificCosmetic,
        generateFourPieceScriptletInner,
    } from '/build/rulesets/scriptlets.js';

    import filters from "/src/js/filters.js"

    export let tabId
    let value = ''
    let disableReload = !$tabId

    // XXX: How to update runtime filters shouldn't live in a component
    async function applyFilters({ reload }) {
        let sessionRules = await browser.declarativeNetRequest.getSessionRules({})

        // XXX: handle rejected rules like 
        // abptestpages.org###remove-id {remove: true;}
        let results = await parseRules(value)
        console.log("Apply filters", results)

        let {
            genericCosmetic,
            genericCosmeticExceptions,
            scriptlet,
            specificCosmetic
        } = results

        await filters.addRuntimeScriptingFilters({
            genericCosmetic: genericCosmetic && Array.from(genericCosmetic.entries()),
            genericCosmeticExceptions: genericCosmeticExceptions && Array.from(genericCosmeticExceptions.values()),
            scriptlet: scriptlet && Array.from(scriptlet.entries()),
            specificCosmetic: specificCosmetic && Array.from(specificCosmetic.entries()),
        })

        let { network: { ruleset: requestedRules } } = results

        let addRules = requestedRules
        let removeRuleIds = sessionRules.map((i) => (i.id))

        await browser.declarativeNetRequest.updateSessionRules({ removeRuleIds, addRules })

        if (reload) {
            await browser.tabs.reload($tabId, { bypassCache: true })
        }
    }

    export async function disableRule(rulesetId, rule) {
        if (rulesetId != browser.declarativeNetRequest.SESSION_RULESET_ID) {
            throw Error(`Wrong Ruleset ${rulesetId}`)
        }

        await browser.declarativeNetRequest.updateSessionRules({ removeRuleIds: [rule.id] })


        let newValue = []
        let filter = ruleToFilter(rule)

        for (let line of value.split("\n")) {
            if (line == filter) {
                newValue.push(`!${line}`)
            } else {
                newValue.push(line)
            }
        }
        
        value = newValue.join("\n")
    }

    onMount(async () => {
        let sessionRules = await browser.declarativeNetRequest.getSessionRules({})
        value = sessionRules.map((e) => (ruleToFilter(e))).join("\n")
    })

    $: disableReload = !$tabId
</script>


<Textarea bind:value={value} />
<Button size="sm" on:click={() => applyFilters({ reload: false })}>Apply</Button>
<Button size="sm" bind:disabled={disableReload} on:click={() => applyFilters({ reload: true })}>Apply & Reload</Button>