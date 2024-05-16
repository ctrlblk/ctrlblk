<script>
    import semver from "semver";

    import { 
        Button,
        Heading,
        Input,
        Label,
    } from 'flowbite-svelte';

    import { onMount } from 'svelte';

    import filters from "/src/js/background/filters.js";
    import { getUpdateUrl } from "/src/js/background/serviceWorker.js";

    import { mockAdReportId } from "/src/js/consts.js";

    import {
        browser,
        runtime,
    } from "/uBOLite/js/ext.js";

    let adReportId = mockAdReportId;
    let version = "";
    let previousVersion = "";

    let openUpdatePage;
    let updateUrl = "";
    let updateReasons = "";

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

<Heading tag="h4">Update Page</Heading>

<form>
    <div class="grid grid-cols-3 py-2">
        <div class="flex items-center"><Label for="adRreportId">AdReport ID</Label></div>
        <div class="col-span-2"><Input type="text" id="adReportId" bind:value="{adReportId}" required /></div>
    </div>

    <div class="grid grid-cols-3 py-2">
        <div class="flex items-center"><Label for="version">Version</Label></div>
        <div class="col-span-2"><Input type="text" id="version" bind:value="{version}" required /></div>
    </div>

    <div class="grid grid-cols-3 py-2">
        <div class="flex items-center"><Label for="version">Previous Version</Label></div>
        <div class="col-span-2"><Input type="text" id="previousVersion" bind:value="{previousVersion}" required /></div>
    </div>

    <div class="grid grid-cols-3 py-2">
        <div class="flex items-center"><Label>Open</Label></div>
        <div class="col-span-2">
            <span>
                {#if openUpdatePage === undefined}
                    N/A
                {:else if openUpdatePage === true}
                    Yes ({updateReasons})
                {:else}
                    No
                {/if}
            </span>
        </div>
    </div>

    <div class="grid grid-cols-3 py-2">
        <div class="flex items-center"><Label>Update URL</Label></div>
        <div class="col-span-2">
            {#if updateUrl }
                <a href="{updateUrl}">{updateUrl}</a>
            {/if}
        </div>
    </div>

    <div class="text-right">
        <Button size="sm" on:click={clickUpdatePage}>Open update page</Button>
    </div>
</form>