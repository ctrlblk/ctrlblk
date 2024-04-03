<script>
    import {
        A,
        Button,
        Heading,
        TableSearch,
        TableBody,
        TableBodyRow,
        TableBodyCell,
    } from "flowbite-svelte";

    import {
        CloseSolid,
        LinkOutline,
    } from "flowbite-svelte-icons";

    // XXX: Code from background page
    import { getAdReportsByDomains } from "/src/js/background/reportAd.js";

    export let exceptions;
    let adReports = new Map();

    let filteredExceptions = [];
    let searchTerm = "";

    function removeException(event) {
        let exception = event.target.closest("tr").querySelector("td").textContent;
        exceptions.update(value => value.filter(e => e !== exception));
    }

    function filterAndMapExceptions(excptns, srchTrm) {
        return excptns.filter(
                exception => exception.toLowerCase().indexOf(srchTrm.toLowerCase()) !== -1
            ).map(
                exception => [exception, adReports.get(exception)]
            );
    }

    exceptions.subscribe(async value => {
        // abort if exceptions hasn't been inititialized yet
        if (value === undefined) {
            return;
        }

        adReports = await getAdReportsByDomains(value);

        filteredExceptions = filterAndMapExceptions(value, searchTerm);
    });

    $: {
        if ($exceptions !== undefined) {
            filteredExceptions = filterAndMapExceptions($exceptions, searchTerm);
        }
    }
</script>


<Heading tag="h4">Exceptions</Heading>


<TableSearch placeholder="Search by domain" hoverable={true} bind:inputValue={searchTerm}>
    <TableBody class="divide-y">
    
    {#if filteredExceptions.length > 0}
        {#each filteredExceptions as [exception, adReports]}
            <TableBodyRow>
                {#if adReports && adReports.length > 0}
                    <TableBodyCell>{exception}</TableBodyCell>
                {:else}
                    <TableBodyCell colspan="2">{exception}</TableBodyCell>
                {/if}

                {#if adReports && adReports.length > 0}
                    <TableBodyCell class="text-right whitespace-nowrap">
                        { adReports.length > 1 ? "(" : ""}
                        {#each adReports as adReport, index}
                            <A href="{adReport.github.url}" target="_blank" class="text-gray-700">
                                #{adReport.github.number}
                                <LinkOutline class="w-4 h-4" />
                            </A>{ index == adReports.length-1 ? "" : ", "}
                        {/each}
                        { adReports.length > 1 ? ")" : ""}
                    </TableBodyCell>
                {/if}
                <TableBodyCell class="text-right w-5">
                    <Button pill={true} outline={true} class="!p-1" on:click={removeException}>
                        <CloseSolid />
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