<script>
    import { createEventDispatcher } from 'svelte';

    import { 
        Button,
        Table,
        TableBody,
        TableBodyRow,
        TableBodyCell,
    } from 'flowbite-svelte'

    import {
        CloseSolid,
    } from "flowbite-svelte-icons";

    import { ruleToFilter } from "/src/js/rules.js";

    const dispatch = createEventDispatcher()

    let disabledRulesView = []

    export function addRule(rulesetId, rule) {
        disabledRulesView.push({
                    ruleId: rule.id,
                    rulesetId: rulesetId,
                    ruleSlug: `${rule.id}@${rulesetId}`,
                    filter: ruleToFilter(rule),
                })
        disabledRulesView = disabledRulesView
    }

    function enableRule(rulesetId, ruleId) {
        // Remove rule from disabledRulesView
        disabledRulesView = disabledRulesView.filter(({ruleId:ruleId_, rulesetId:rulesetId_}) => !(ruleId == ruleId_ && rulesetId == rulesetId_))

        // Dispatch enableRule event so App can take care of enabling
        dispatch("enableRule", { ruleId, rulesetId })
    }
</script>

<Table>
    <TableBody>
        {#each disabledRulesView as {ruleSlug, ruleId, rulesetId, filter}}
            <TableBodyRow>
                <TableBodyCell>
                    { ruleSlug }
                </TableBodyCell>
                <TableBodyCell>
                    { filter }
                </TableBodyCell>
                <TableBodyCell class="text-right w-5">
                    <Button pill={true} outline={true} class="!p-1" on:click={enableRule(rulesetId, ruleId)}>
                        <CloseSolid />
                    </Button>
                </TableBodyCell>
            </TableBodyRow>
        {/each}
    </TableBody>
</Table>
