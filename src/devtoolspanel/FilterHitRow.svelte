<script>
    import {
        TableBodyCell,
        TableBodyRow,
        TableHead,
        TableHeadCell,
     } from 'flowbite-svelte';

    import collapse from 'svelte-collapse'

    import Flux from "./Flux.svelte"

    export let row

    let { bgColor, time, filter, ruleId, rulesetId, tabTitle, requestURL } = row

    let open = false

    let requestURLMaxLength = 80
    let requestURLShort = requestURL.substr(0, requestURLMaxLength)
</script>

<TableBodyRow class="{bgColor}" on:click={() => open = true}>
    <TableBodyCell>{time}</TableBodyCell>
    <TableBodyCell>
        {filter}
        <div use:collapse={{open}}>
            <Flux {ruleId} {rulesetId} {open} />
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
