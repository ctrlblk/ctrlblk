<script>
    import { onMount } from 'svelte';

    import { Checkbox } from 'flowbite-svelte';

    import { browser } from "/uBOLite/js/ext.js"

    import { config } from "/src/js/broadcast.js";

    export let ruleId
    export let rulesetId

    let checked = true

    onMount(async () => {

        for (let rule of await browser.declarativeNetRequest.getDisabledRuleIds({ rulesetId })) {
            if (rule.id == ruleId) {
                checked = false
                break
            }
        }

    })

    async function change(event) {
        console.log(checked)
        if (checked) {
            await browser.declarativeNetRequest.updateStaticRules({ rulesetId, enableRuleIds: [ ruleId ] })
        } else {
            await browser.declarativeNetRequest.updateStaticRules({ rulesetId, disableRuleIds: [ ruleId ] })
            config.postMessage({ key: "updateStaticRules", value: { rulesetId, disableRuleIds: [ ruleId ] }})
        }
    }
</script>


<Checkbox bind:checked={checked} on:change={change} />{ruleId}
