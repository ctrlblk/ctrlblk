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

    export let tabId
    let value = ''
    let disableReload = !$tabId

    async function applyFilters({ reload }) {
        let sessionRules = await browser.declarativeNetRequest.getSessionRules({})

        let results = await parseRules(value)
        console.log("Apply filters", results)
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