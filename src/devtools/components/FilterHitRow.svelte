<script>
    import { createEventDispatcher } from 'svelte'

    import {
        Button,
        Checkbox,
        TableBodyCell,
        TableBodyRow,
        TableHead,
        TableHeadCell,
     } from 'flowbite-svelte';

    import {
        CloseSolid,
    } from "flowbite-svelte-icons";

    import collapse from 'svelte-collapse'

    import Filter from "./Filter.svelte"
    //import RuleCheckbox from "./RuleCheckbox.svelte"

    export let row

    const dispatch = createEventDispatcher()

    let { bgColor, time, filter, ruleId, rulesetId, tabTitle, requestURL } = row

    let open = false
    let enabled = true

    let requestURLMaxLength = 80
    let requestURLShort = requestURL.substr(0, requestURLMaxLength)
</script>

{#if enabled}
    <TableBodyRow class="{bgColor}">
        <TableBodyCell class="!p-4">
            <Button pill={true} outline={true} class="!p-1" on:click={() => {
                    enabled = false
                    dispatch("disableRule", {ruleId, rulesetId})
                }}>
                <CloseSolid />
            </Button>
        </TableBodyCell>
        <TableBodyCell>{time}</TableBodyCell>
        <TableBodyCell on:click={() => open = !open}>
            {filter}
            <div use:collapse={{open}}>
                <Filter {ruleId} {rulesetId} {open} />
            </div>
        </TableBodyCell>
        <TableBodyCell>{rulesetId}</TableBodyCell>
        <TableBodyCell>{tabTitle}</TableBodyCell>
        <TableBodyCell>
            {#if open }
                { requestURL }
            {:else}
                { requestURLShort }
            {/if}
        </TableBodyCell>
    </TableBodyRow>
{/if}