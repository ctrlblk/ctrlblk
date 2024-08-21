<script>
    import {
        AccordionItem,
        Accordion,
        Checkbox,
        Heading,
     } from 'flowbite-svelte';

    import { onMount } from "svelte";

    import filters from "/src/js/filters.js";

    export let rulesetGroups = new Map();

    function groupRulesets(rulesetDetails) {
        console.log("groupRulesets", rulesetDetails)
        rulesetDetails = rulesetDetails || []
        return new Map([
            [
                "Default",
                rulesetDetails.filter(([id, ruleset]) =>
                    ["default", "ctrlblk"].includes(id))
            ],
            [
                "Annoyances",
                rulesetDetails.filter(([id, ruleset]) => ruleset.group === "annoyances")
            ],
            [
                "Miscellaneous",
                rulesetDetails.filter(([id, ruleset]) =>
                    !["default", "ctrlblk"].includes(id) && ruleset.group === undefined && typeof ruleset.lang !== 'string')
            ],
            [
                'Regional',
                rulesetDetails.filter(([id, ruleset]) => typeof ruleset.lang === 'string'),
            ],
        ].filter((e) => e[1].length > 0));
    }

    onMount(async () => {
        let rulesetDetails = await filters.getFilterlistDetails();
        rulesetGroups = groupRulesets(rulesetDetails);

    });

    const updateRuleset = (e) => {        
        let { value, checked } = e.target;

        if (checked) {
            filters.enableFilterlist(value);
        } else {
            filters.disableFilterlist(value);

        }
    };
</script>


<Heading tag="h4">Filter lists</Heading>

<Accordion flush>
    {#each rulesetGroups as [groupName, rulesetDetails]}
        <AccordionItem>
            <span slot="header">
                {groupName}

                {#if rulesetDetails.filter(([id, rule]) => rule.enabled).length > 0}
                <span class="font-light">
                    ({#each rulesetDetails.filter(([id, rule]) => rule.enabled) as [id, rule], index}
                        {rule.name}
                        {index < rulesetDetails.filter(([id, rule]) => rule.enabled).length - 1 ? "| " : ""}
                    {/each})
                </span>
                {/if}
            </span>

            {#each rulesetDetails as [id, rule]}
                <div class="px-4">
                    <Checkbox value={id} bind:checked={rule.enabled} on:click={updateRuleset} class="font-light">
                        {rule.name}
                    </Checkbox>
                </div>
            {/each}
        </AccordionItem>
    {/each}
</Accordion>