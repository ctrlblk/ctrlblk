<script>
    import { XCircle, ExternalLink } from "lucide-svelte";

    // XXX: Code from background page
    import { getAdReportsByDomains } from "/src/js/background/reportAd.js";

    let { exceptions } = $props();
    let adReports = new Map();

    let filteredExceptions = $state([]);
    let searchTerm = $state("");

    function removeException(exceptionToRemove) {
        exceptions.update(value => value.filter(e => e !== exceptionToRemove));
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

<h3 class="text-sm font-medium text-zinc-900 dark:text-zinc-100">Exceptions</h3>

<div class="mt-3">
    <div class="relative">
        <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"></path>
        </svg>
        <input
            bind:value={searchTerm}
            type="text"
            placeholder="Search domains..."
            class="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-10 pr-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-500"
        />
    </div>
</div>

<ul class="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
    {#if filteredExceptions.length > 0}
        {#each filteredExceptions as [exception, reports]}
            <li class="flex items-center justify-between gap-2 py-2.5">
                <div class="flex min-w-0 items-center gap-2">
                    <span class="truncate text-sm text-zinc-700 dark:text-zinc-300">{exception}</span>
                    {#if reports && reports.length > 0}
                        {#each reports as report, index}
                            <a href={report.github.url} target="_blank" class="inline-flex shrink-0 items-center gap-0.5 text-xs text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300">
                                #{report.github.number}
                                <ExternalLink class="h-3 w-3" />
                            </a>
                        {/each}
                    {/if}
                </div>
                <button
                    onclick={() => removeException(exception)}
                    class="shrink-0 text-zinc-300 transition-colors hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-400"
                    title="Remove exception"
                >
                    <XCircle class="h-4 w-4" />
                </button>
            </li>
        {/each}
    {:else}
        <li class="py-2.5 text-sm text-zinc-400 dark:text-zinc-500">No exceptions</li>
    {/if}
</ul>
