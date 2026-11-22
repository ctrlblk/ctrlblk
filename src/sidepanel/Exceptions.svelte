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

    let { exceptions } = $props();

    let searchTerm = $state("");

    function removeException(event) {
        let exception = event.target.closest("tr").querySelector("td").textContent;
        exceptions.update(value => value.filter(e => e !== exception));
    }

    function filterExceptions(excptns, srchTrm) {
        return excptns.filter(
                exception => exception.toLowerCase().indexOf(srchTrm.toLowerCase()) !== -1
            );
    }

    let filteredExceptions = $derived(
        $exceptions === undefined ? [] : filterExceptions($exceptions, searchTerm)
    );
</script>


<Heading tag="h4">Exceptions</Heading>


<TableSearch placeholder="Search by domain" hoverable={true} bind:inputValue={searchTerm}>
    <TableBody class="divide-y">
    
    {#if filteredExceptions.length > 0}
        {#each filteredExceptions as exception}
            <TableBodyRow>
                <TableBodyCell class="text-gray-900 dark:text-white">{exception}</TableBodyCell>
                <TableBodyCell class="text-right w-5">
                    <Button pill={true} outline={true} class="!p-1 hover:bg-primary-700" onclick={removeException}>
                        <CloseCircleSolid />
                    </Button>
                </TableBodyCell>
            </TableBodyRow>
        {/each}
    {:else}
        <TableBodyRow>
            <TableBodyCell class="text-gray-900 dark:text-white">No exceptions</TableBodyCell>
        </TableBodyRow>
    {/if}

    </TableBody>
</TableSearch>