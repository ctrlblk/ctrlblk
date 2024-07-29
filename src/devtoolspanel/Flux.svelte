<script>
    import { onMount, beforeUpdate } from 'svelte';

    import { browser } from "/uBOLite/js/ext.js"

    import { getRule } from "./rules.js"

    let ruleFormatted

    export let ruleId
    export let rulesetId
    export let open 


    beforeUpdate(async () => {
        if (open) {
            let rule = await getRule(ruleId, rulesetId)
            ruleFormatted = JSON.stringify(rule, undefined, 4) 
        }
    })
</script>

<textarea class="min-w-full min-h-52">
    { ruleFormatted }
</textarea>
