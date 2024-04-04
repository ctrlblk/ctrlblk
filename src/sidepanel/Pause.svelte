<script>
    import {
        Button,
        Heading,
        Secondary,
        Spinner,
    } from 'flowbite-svelte';

    import {
        PlaySolid,
        PauseSolid,
        CheckOutline,
        CloseOutline,
        RefreshOutline,
        ThumbsUpOutline,
        ThumbsDownOutline,
    } from 'flowbite-svelte-icons';

    import { onMount, onDestroy } from 'svelte';

    import { browser } from "/uBOLite/js/ext.js";

    // XXX: Non background page using background page code
    import { getAdReportsByDomains } from "/src/js/background/reportAd.js";

    import {
        createAdReportData,
        uploadAdReport
    } from "/src/js/reportAd.js";

    import AdReport from "./AdReport.svelte";

    export let exceptions;

    let disabled = false;

    let currentTabHostname = "";
    let currentTabExempt = false;

    // Available states:
    // - PlayPause
    // - PreviewReport
    // - SendReport
    // - Reload
    // - SendingReport
    let defaultState = "PlayPause";
    let state = defaultState;

    // Used to keep track of whether exempt status needs to be updated or not
    // in case exceptions where manipulated outside of this component and
    // reload functionality is still needed/offered i.e. offer reload when
    // remocing an exception from the Exception component
    // Available intents:
    // - Play
    // - Pause
    let defaultIntent = "";
    let intent = defaultIntent;

    // Map to keep track of state and intent per tab
    let tabState = new Map();


    let tableData = [];
    let adReport = {};

    async function changeExempt() {
        if (intent === "Play") {
            exceptions.update(value => value.filter(e => e !== currentTabHostname));
        } else if (intent === "Pause") {
            if (!$exceptions.includes(currentTabHostname)) {
                exceptions.update(value => [...value, currentTabHostname]);
            }
        }
        intent = defaultIntent;
    }

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

    async function createAdReport() {
        let image = await browser.tabs.captureVisibleTab();
        adReport.data = await createAdReportData(image)

        let clonedData = JSON.parse(JSON.stringify(adReport.data));
        clonedData.screenshot = clonedData.screenshot.split(",")[0] + "...";
        flattenObjectTree(clonedData, tableData);

        // XXX: This is a hack to trigger svelte reactiveness
        // to get the table to update because updating the tableData
        // in flattenObjectTree doesn't trigger a re-render
        tableData = tableData;
    }

    async function clickPlayPause() {
        // Advance state but don't change the exempt status yet
        if (currentTabExempt) {
            state = "Reload";
            intent = "Play";
        } else {
            // Only offer to send a report if there are ad reports for the current tab
            let adReportsForPage = await getAdReportsByDomains([currentTabHostname]);

            if (adReportsForPage.has(currentTabHostname)) {
                state = "Reload";
            } else {
                state = "SendReport";
            }
            intent = "Pause";
        }
    }

    function clickPreview() {
        createAdReport();
        state = "PreviewReport";
    }
    function clickNoAdReport() {
        state = "Reload";
    }

    async function clickSend() {
        state = "SendingReport";

        adReport.uuid = await uploadAdReport(adReport.data);

        state = "Reload";
    }
    function clickNoSend() {
        state = "Reload";
    }

    async function clickReload() {
        await changeExempt();
        let [currentTab] = await browser.tabs.query({active: true, currentWindow: true});
        browser.tabs.reload(currentTab.id);
        state = "PlayPause";
    }

    async function clickNoReload() {
        await changeExempt();
        state = "PlayPause";
    }

    let previousExceptions;
    function exceptionsChangedHandler(value) {
        // abort if exceptions hasn't been inititialized yet
        if (value === undefined) {
            return;
        }

        let prevExempt = currentTabExempt;
        currentTabExempt = value.includes(currentTabHostname);

        // Only update state in case of a change
        // and not as part of inialization
       if (previousExceptions !== undefined &&
                prevExempt !== currentTabExempt) {
            state = "Reload";
        }

        // Remember the previous exceptions for the above check
        previousExceptions = $exceptions;
    }

    let previousTabId;
    async function tabChangedHandler(tabId) {
        // update currentTabHostname
        let tabInfo;
        try {
            tabInfo = await browser.tabs.get(tabId);

            // Abort if tab doesn't belong to the current window
            let currentWindow = await browser.windows.getCurrent();
            if (tabInfo.windowId !== currentWindow.id) {
                return;
            }

        } catch (e) {
            // tab might have been closed
            return;
        }

        if (tabInfo.url) {
            let url = new URL(`${tabInfo.url}/`);
            currentTabHostname = url.hostname;
        } else {
            currentTabHostname = "";
        }

        // disable on internal pages like chrome:// and about://
        disabled = false;
        for (let prefix of ["chrome://" , "about://"]) {
            if (tabInfo.url.startsWith(prefix)) {
                disabled = true;
                break;
            }
        }

        // update whether currentTabHostname is exempt or not
        if ($exceptions !== undefined) {
            currentTabExempt = $exceptions.includes(currentTabHostname);
        }

        // remember the state and intent of the previous tab
        if (previousTabId !== undefined && previousTabId !== tabId) {
            tabState.set(previousTabId, { state, intent });
        }

        // restore the state and intent of the current tab if it exists
        if (tabState.has(tabId)) {
            ({ state, intent } = tabState.get(tabId));
            tabState.delete(tabId);
        } else {
            state = defaultState;
            intent = defaultIntent;

            tabState.set(previousTabId, { state, intent });
        }

        // remember the current tab as the previous tab id
        previousTabId = tabId;
    }

    onMount(async () => {
        exceptions.subscribe(exceptionsChangedHandler);

        let [currentTab] = await browser.tabs.query({active: true, currentWindow: true});

        await tabChangedHandler(currentTab.id);

        browser.tabs.onActivated.addListener(event => tabChangedHandler(event.tabId));
        browser.tabs.onUpdated.addListener(event => tabChangedHandler(event));
        browser.tabs.onCreated.addListener(event => tabChangedHandler(event.id));
    });

    onDestroy(() => {
        browser.tabs.onActivated.removeListener(onActivatedHandler);
        browser.tabs.onUpdated.removeListener(onUpdatedHandler);
        browser.tabs.onCreated.removeListener(onCreatedHandler);
    });
</script>

<Heading tag="h4">
    {#if state === "PlayPause" }
        {#if currentTabExempt}
            Restart blocking on
        {:else}
            Pause blocking on
        {/if}
    {:else if state === "SendReport" }
        Send AdReport for
    {:else if state === "PreviewReport" }
        Send
    {:else if state === "Reload" }
        Reload
    {:else if state === "SendingReport" }
        Uploading AdReport for
    {/if}
    <Secondary class="ms-2">{currentTabHostname}</Secondary>

    {#if ["PlayPause", "SendReport", "PreviewReport", "Reload"].includes(state)}
        ?
    {/if}
</Heading>

<div class="grid grid-cols-2 py-4 space-x-2">
    {#if state === "PlayPause" }
        <div class="text-right px-2">
            <Button disabled={disabled} pill={true} outline={true} class="!p-2" on:click={clickPlayPause}>
                {#if currentTabExempt}
                    <PlaySolid class="w-10 h-10" />
                {:else}
                    <PauseSolid class="w-10 h-10" />
                {/if}
            </Button>
        </div>
    {:else if state === "SendReport" }
        <div class="text-right px-2">
            <Button disabled={disabled} pill={true} outline={true} class="!p-2"  on:click={clickPreview}>
                <CheckOutline class="w-10 h-10" />
            </Button>
        </div>
        <div class="px-2">
            <Button disabled={disabled} pill={true} outline={true} class="!p-2"  on:click={clickNoAdReport}>
                <CloseOutline class="w-10 h-10" />
            </Button>
        </div>
    {:else if state === "PreviewReport" }
        <div class="text-right px-2">
            <Button disabled={disabled} pill={true} outline={true} class="!p-2"  on:click={clickSend}>
                <ThumbsUpOutline class="w-10 h-10" />
            </Button>
        </div>
        <div class="px-2">
            <Button disabled={disabled} pill={true} outline={true} class="!p-2"  on:click={clickNoSend}>
                <ThumbsDownOutline class="w-10 h-10" />
            </Button>
        </div>
    {:else if state === "SendingReport" }
        <div class="text-right px-2">
            <Spinner size={12} />
        </div>
    {:else if state === "Reload" }
        <div class="text-right px-2">
            <Button disabled={disabled} pill={true} outline={true} class="!p-2"  on:click={clickReload}>
                <RefreshOutline class="w-10 h-10" />
            </Button>
        </div>
        <div class="px-2">
            <Button disabled={disabled} pill={true} outline={true} class="!p-2"  on:click={clickNoReload}>
                <CloseOutline class="w-10 h-10" />
            </Button>
        </div>
    {/if}
</div>

{#if state === "PreviewReport" }
    {#if adReport.data}
        <AdReport {adReport} />
    {/if}
{/if}