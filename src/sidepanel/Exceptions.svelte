<script>
    import {
        Button,
        Heading,
        TableSearch,
        TableBody,
        TableBodyRow,
        TableBodyCell,
    } from "flowbite-svelte";

    import {
        CloseCircleSolid,
    } from "flowbite-svelte-icons";

    export let exceptions;

    let filteredExceptions = [];
    let searchTerm = "";

    function removeException(event) {
        let exception = event.target.closest("tr").querySelector("td").textContent;
        exceptions.update(value => value.filter(e => e !== exception));
    }

    function filterExceptions(excptns, srchTrm) {
        return excptns.filter(
                exception => exception.toLowerCase().indexOf(srchTrm.toLowerCase()) !== -1
            );
    }

    $: {
        if ($exceptions !== undefined) {
            filteredExceptions = filterExceptions($exceptions, searchTerm);
        }
    }
</script>


<Heading tag="h4">Exceptions</Heading>


<TableSearch placeholder="Search by domain" hoverable={true} bind:inputValue={searchTerm}>
    <TableBody class="divide-y">
    
    {#if filteredExceptions.length > 0}
        {#each filteredExceptions as exception}
            <TableBodyRow>
                <TableBodyCell>{exception}</TableBodyCell>
                <TableBodyCell class="text-right w-5">
                    <Button pill={true} outline={true} class="!p-1" on:click={removeException}>
                        <CloseCircleSolid />
                    </Button>
                </TableBodyCell>
            </TableBodyRow>
        {/each}
    {:else}
        <TableBodyRow>
            <TableBodyCell>No exceptions</TableBodyCell>
        </TableBodyRow>
    {/if}

    </TableBody>
</TableSearch>