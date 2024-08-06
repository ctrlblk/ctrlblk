<script>
    import { 
        Button,
    } from 'flowbite-svelte';

    import {
        CloseSolid,
    } from "flowbite-svelte-icons";

    import { browser } from "/uBOLite/js/ext.js";

    import { config } from "/src/js/broadcast.js";

    export let rule
    export let disabledRules


    async function enableRule(event) {
        let { ruleId, rulesetId } = rule
        await browser.declarativeNetRequest.updateStaticRules({ rulesetId, enableRuleIds: [ ruleId ] })
        await config.postMessage({ key: "updateStaticRules", value: { rulesetId, enableRuleIds: [ ruleId ] }})
        disabledRules.update((rules) => rules.filter((rule) => rule.ruleId !== ruleId))
    }
</script>

<Button pill={true} outline={true} class="!p-1" on:click={enableRule}>
    <CloseSolid />
</Button>
