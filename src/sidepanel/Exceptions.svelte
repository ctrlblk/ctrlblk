<script>
    import Button from "/src/lib/ui/Button.svelte";
    import TableSearch from "/src/lib/ui/TableSearch.svelte";
    import TableBody from "/src/lib/ui/TableBody.svelte";
    import TableBodyRow from "/src/lib/ui/TableBodyRow.svelte";
    import TableBodyCell from "/src/lib/ui/TableBodyCell.svelte";
    import { XCircle, ExternalLink } from "lucide-svelte";

    // XXX: Code from background page
    import { getAdReportsByDomains } from "/src/js/background/reportAd.js";

    let { exceptions } = $props();
    let adReports = new Map();

    let filteredExceptions = $state([]);
    let searchTerm = $state("");

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

    $effect(() => {
        const unsubscribe = exceptions.subscribe(async value => {
            // abort if exceptions hasn't been inititialized yet
            if (value === undefined) {
                return;
            }

            adReports = await getAdReportsByDomains(value);

            filteredExceptions = filterAndMapExceptions(value, searchTerm);
        });
        return unsubscribe;
    });

    $effect(() => {
        if ($exceptions !== undefined) {
            filteredExceptions = filterAndMapExceptions($exceptions, searchTerm);
        }
    });
</script>


<h4 class="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Exceptions</h4>


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
                            <a href={adReport.github.url} target="_blank" class="inline-flex items-center gap-1 text-gray-700 hover:underline">
                                #{adReport.github.number}
                                <ExternalLink class="w-4 h-4" />
                            </a>{ index == adReports.length-1 ? "" : ", "}
                        {/each}
                        { adReports.length > 1 ? ")" : ""}
                    </TableBodyCell>
                {/if}
                <TableBodyCell class="text-right w-5">
                    <Button pill={true} outline={true} class="!p-1" onclick={removeException}>
                        <XCircle class="w-5 h-5" />
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