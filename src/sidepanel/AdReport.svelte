<script>
    import Table from "/src/lib/ui/Table.svelte";
    import TableBody from "/src/lib/ui/TableBody.svelte";
    import TableBodyCell from "/src/lib/ui/TableBodyCell.svelte";
    import TableBodyRow from "/src/lib/ui/TableBodyRow.svelte";
    import TableHead from "/src/lib/ui/TableHead.svelte";
    import TableHeadCell from "/src/lib/ui/TableHeadCell.svelte";
    import { ExternalLink } from 'lucide-svelte';

    import { formatDistanceToNow } from 'date-fns';

    import Expandable from './Expandable.svelte';

    let { adReport = {} } = $props();

    let adReportView = $derived(adReportViewFromAdReport(adReport));

    let tableData = $derived.by(() => {
        let adReportDataCloned = JSON.parse(JSON.stringify(adReport.data));
        adReportDataCloned.screenshot = adReportDataCloned.screenshot.split(",")[0] + "...";
        let result = [];
        flattenObjectTree(adReportDataCloned, result);
        return result;
    });

    function flattenObjectTree(obj, output, parents = []) {
        for (let [key, value] of Object.entries(obj)) {
            if (typeof value === "object" && !Array.isArray(value)) {
                flattenObjectTree(value, output, parents.concat([key]));
            } else if (Array.isArray(value)) {
                output.push([parents.concat([key]).join('.'), value.join(', ')]);
            } else {
                output.push([parents.concat([key]).join('.'), value]);
            }
        }
    }

    function adReportViewFromAdReport(adReport) {
        const url = new URL(adReport.data.page.url);

        const pageSlug = url.hostname;
        const pageLink = url.href;
        const issueSlug = adReport.github?.number ? `#${adReport.github?.number}` : undefined;
        const issueLink = adReport.github?.url;
        const screenshot = adReport.data.screenshot;
        const datetime = adReport.data.page.datetime;

        return {
            pageSlug,
            pageLink,
            issueSlug,
            issueLink,
            screenshot,
            datetime,
        };
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return formatDistanceToNow(date, { addSuffix: true });
    }
</script>

<div class="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
    <div class="mb-3">
        <a href="{adReportView.pageLink}" target="_blank" class="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-900 transition-colors hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300">
            {adReportView.pageSlug}
            <ExternalLink class="h-3 w-3 text-zinc-400" />
        </a>
    </div>

    <p class="text-xs text-zinc-400 dark:text-zinc-500" title="{adReportView.datetime}">{formatDate(adReportView.datetime)}</p>

    <div class="mt-3 h-36 overflow-hidden rounded">
        <img src="{adReportView.screenshot}" alt="Screenshot of {adReportView.pageSlug}" class="h-full w-full object-cover" />
    </div>

    <div class="mt-3">
        <Expandable>
            {#snippet label()}
                <span class="text-xs">Show all data</span>
            {/snippet}
            {#snippet content()}
                <Table class="text-xs">
                    <TableHead>
                        <TableHeadCell class="px-3 py-2">Key</TableHeadCell>
                        <TableHeadCell class="px-3 py-2">Value</TableHeadCell>
                    </TableHead>
                    <TableBody class="divide-y">
                    {#each tableData as [key, value]}
                        <TableBodyRow>
                            <TableBodyCell class="px-3 py-2">{key}</TableBodyCell>
                            <TableBodyCell class="px-3 py-2">{value}</TableBodyCell>
                        </TableBodyRow>
                    {/each}
                    </TableBody>
                </Table>
            {/snippet}
        </Expandable>
    </div>

    {#if adReportView.issueLink}
        <div class="mt-3 text-right">
            <a href={adReportView.issueLink} target="_blank" class="text-xs text-zinc-500 transition-colors hover:text-zinc-700 dark:hover:text-zinc-300">{adReportView.issueSlug}</a>
        </div>
    {/if}
</div>
