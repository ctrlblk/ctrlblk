<script>
    import {
        A,
        Card,
        Heading,
        Table,
        TableBody,
        TableBodyCell,
        TableBodyRow,
        TableHead,
        TableHeadCell,
    } from 'flowbite-svelte';

    import {
        LinkOutline,
    } from 'flowbite-svelte-icons';

    import { formatDistanceToNow } from 'date-fns';

    import Expandable from './Expandable.svelte';

    export let tableData = [];
    export let adReport = {};

    let adReportView;

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

    $: {
        console.log("AdReport", adReport);
        adReportView = adReportViewFromAdReport(adReport);
        let adReportDataCloned = JSON.parse(JSON.stringify(adReport.data));
        adReportDataCloned.screenshot = adReportDataCloned.screenshot.split(",")[0] + "...";
        flattenObjectTree(adReportDataCloned, tableData);

        // XXX: This is a hack to trigger svelte reactiveness
        // to get the table to update because updating the tableData
        // in flattenObjectTree doesn't trigger a re-render
        tableData = tableData;
    }

</script>

<Card style="max-width:100%;">
    <div class="mb-3">
        <a href="{adReportView.pageLink}" target="_blank" class="flex items-center text-sm font-medium text-gray-600 dark:text-gray-400 hover:underline">
            <Heading tag="h4">{adReportView.pageSlug}</Heading>
            <LinkOutline size="xs" class="ml-2 -mr-1" />
        </a>
    </div>

    <div class="my-3">
        <p class="float-left font-normal text-gray-700 leading-tight" title="{adReportView.datetime}">{formatDate(adReportView.datetime)}</p>
    </div>

    <div class="h-40 overflow-hidden relative">
        <img src="{adReportView.screenshot}" alt="Screenshot of {adReportView.pageSlug}" class="absolute inset-0 w-full h-full object-cover" />
    </div>

    <div>
        <Expandable>
            <span slot="label" class="my-3">Show all data</span>
            <Table slot="content" class="text-xs">
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
        </Expandable>
    </div>

    {#if adReportView.issueLink}
        <div class="mt-3">
            <A href="{adReportView.issueLink}" target="_blank" class="float-right text-gray-700">{adReportView.issueSlug}</A>
        </div>
    {/if}
</Card>