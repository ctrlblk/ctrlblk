<script>
    import semver from "semver";

    import Button from "/src/lib/ui/Button.svelte";
    import Input from "/src/lib/ui/Input.svelte";
    import Label from "/src/lib/ui/Label.svelte";

    import { onMount } from 'svelte';

    import filters from "/src/js/background/filters.js";
    import { getUpdateUrl } from "/src/js/background/serviceWorker.js";

    import { mockAdReportId } from "/src/js/consts.js";

    import {
        browser,
        runtime,
    } from "/src/js/lib/browser-api.js";

    let adReportId = $state(mockAdReportId);
    let version = $state("");
    let previousVersion = $state("");

    let openUpdatePage = $state();
    let updateUrl = $state("");
    let updateReasons = $state("");

    onMount(() => {

        let ver = semver.coerce(runtime.getManifest().version);

        version = ver.format();

        if (ver.major == 0) {
            ver.minor--
        } else {
            ver.major--
        }

        previousVersion = ver.format();
    });


    async function clickUpdatePage() {

        let details = { previousVersion: previousVersion, reason: 'update' }

        // Collect and assemble data to be sent to the update server
        let config = await filters.getConfiguration();

        config.meta.extension.version = version;

        // Retrieve and clear local ad reports
        let adReportIds = adReportId.trim() ? [adReportId.trim()] : [];

        // Same as above / pretend we've fixed all
        let adReportsFixed = {
            uuids: adReportIds
        }

        let { open_update_page, update_url, reasons } = await getUpdateUrl({ details, config, adReportIds, adReportsFixed });

        openUpdatePage = open_update_page;
        updateUrl = update_url;
        updateReasons = reasons.join(", ");

        // open update page?
        if (open_update_page) {
            browser.tabs.create({url: update_url});
        }
    }
</script>

<h3 class="text-sm font-medium text-zinc-900 dark:text-zinc-100">Update Page</h3>

<form class="mt-3 space-y-3">
    <div class="grid grid-cols-3 items-center gap-2">
        <Label for="adRreportId">AdReport ID</Label>
        <div class="col-span-2"><Input type="text" id="adReportId" bind:value="{adReportId}" required /></div>
    </div>

    <div class="grid grid-cols-3 items-center gap-2">
        <Label for="version">Version</Label>
        <div class="col-span-2"><Input type="text" id="version" bind:value="{version}" required /></div>
    </div>

    <div class="grid grid-cols-3 items-center gap-2">
        <Label for="version">Previous Version</Label>
        <div class="col-span-2"><Input type="text" id="previousVersion" bind:value="{previousVersion}" required /></div>
    </div>

    <div class="grid grid-cols-3 items-center gap-2">
        <Label>Open</Label>
        <div class="col-span-2 text-sm text-zinc-600 dark:text-zinc-400">
            {#if openUpdatePage === undefined}
                N/A
            {:else if openUpdatePage === true}
                Yes ({updateReasons})
            {:else}
                No
            {/if}
        </div>
    </div>

    <div class="grid grid-cols-3 items-center gap-2">
        <Label>Update URL</Label>
        <div class="col-span-2 truncate text-sm">
            {#if updateUrl }
                <a href="{updateUrl}" class="text-zinc-600 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200">{updateUrl}</a>
            {/if}
        </div>
    </div>

    <div class="pt-1 text-right">
        <Button size="sm" onclick={clickUpdatePage}>Open update page</Button>
    </div>
</form>
