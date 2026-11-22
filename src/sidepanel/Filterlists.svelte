<script>
    import {
        AccordionItem,
        Accordion,
        Checkbox,
        Heading,
     } from 'flowbite-svelte';

    import { onMount } from "svelte";

    import filters from "/src/js/filters.js";

    // An array of [groupName, rulesetDetails] pairs, not a Map: $state makes
    // arrays deeply reactive, so the headers follow the checkboxes.
    let rulesetGroups = $state([]);

    function groupRulesets(rulesetDetails) {
        return [
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
        ].filter((e) => e[1].length > 0);
    }

    onMount(async () => {
        let rulesetDetails = await filters.getFilterlistDetails();
        rulesetGroups = groupRulesets(rulesetDetails);

    });

    const updateRuleset = (id, checked) => {
        if (checked) {
            filters.enableFilterlist(id);
        } else {
            filters.disableFilterlist(id);

        }
    };
</script>


<Heading tag="h4">Filter lists</Heading>

<Accordion flush>
    {#each rulesetGroups as [groupName, rulesetDetails]}
        <AccordionItem>
            {#snippet header()}
            <span>
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
            {/snippet}

            {#each rulesetDetails as [id, rule]}
                <div class="px-4">
                    <!-- No value prop: with one and no group, Checkbox forces checked to false -->
                    <Checkbox bind:checked={rule.enabled} onclick={(e) => updateRuleset(id, e.target.checked)} classes={{ div: "font-light text-gray-900 dark:text-gray-300" }}>
                        {rule.name}
                    </Checkbox>
                </div>
            {/each}
        </AccordionItem>
    {/each}
</Accordion>
