<script>
    import Accordion from "/src/lib/ui/Accordion.svelte";
    import AccordionItem from "/src/lib/ui/AccordionItem.svelte";
    import Checkbox from "/src/lib/ui/Checkbox.svelte";

    import { onMount } from "svelte";

    import filters from "/src/js/filters.js";

    let rulesetGroups = $state(new Map());

    function groupRulesets(rulesetDetails) {
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

    function updateRuleset(id, rule) {
        rule.enabled = !rule.enabled;
        if (rule.enabled) {
            filters.enableFilterlist(id);
        } else {
            filters.disableFilterlist(id);
        }
        // Reassign to trigger Svelte 5 reactivity for the accordion headers
        rulesetGroups = new Map(rulesetGroups);
    }
</script>


<h4 class="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Filter lists</h4>

<Accordion flush>
    {#each rulesetGroups as [groupName, rulesetDetails]}
        <AccordionItem>
            {#snippet header()}
                {groupName}

                {#if rulesetDetails.filter(([id, rule]) => rule.enabled).length > 0}
                <span class="font-light">
                    ({#each rulesetDetails.filter(([id, rule]) => rule.enabled) as [id, rule], index}
                        {rule.name}
                        {index < rulesetDetails.filter(([id, rule]) => rule.enabled).length - 1 ? "| " : ""}
                    {/each})
                </span>
                {/if}
            {/snippet}

            {#each rulesetDetails as [id, rule]}
                <div class="px-4">
                    <Checkbox checked={rule.enabled} onclick={() => updateRuleset(id, rule)} class="font-light">
                        {rule.name}
                    </Checkbox>
                </div>
            {/each}
        </AccordionItem>
    {/each}
</Accordion>