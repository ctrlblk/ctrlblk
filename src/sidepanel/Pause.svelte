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
        BugOutline,
    } from 'flowbite-svelte-icons';

    import { onMount } from 'svelte';

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

    let currentState = "PlayPause";

    let adReport = {};

    async function createAdReport() {
        let image = await browser.tabs.captureVisibleTab();
        adReport.data = await createAdReportData(image)

        let clonedData = JSON.parse(JSON.stringify(adReport.data));
        clonedData.screenshot = clonedData.screenshot.split(",")[0] + "...";
    }

    async function clickPause() {
        // Create ad report for future use
        // Important: need to wait otherwhise report will include exception added below
        // That wasn't present previously
        await createAdReport();

        // Add exception
        if (!$exceptions.includes(currentTabHostname)) {
            exceptions.update(value => [...value, currentTabHostname]);
        }

        // Reload page
        let [currentTab] = await browser.tabs.query({active: true, currentWindow: true});
        browser.tabs.reload(currentTab.id);

        currentState = "Ask";
    }

    async function clickPlay() {
        // Remove exception
        exceptions.update(value => value.filter(e => e !== currentTabHostname));

        // Reload page
        let [currentTab] = await browser.tabs.query({active: true, currentWindow: true});
        browser.tabs.reload(currentTab.id);

        currentState = "PlayPause";
    }

    async function clickReport() {
        // Create ad report for future use
        createAdReport();

        currentState = "PreviewReport";
    }

    async function clickItHelped() {

        adReport.data.functional = {
            pauseHelped: true,
        }

        // Only offer to send a report if there are no ad reports for the current tab
        let adReportsForPage = await getAdReportsByDomains([currentTabHostname]);

        if (adReportsForPage.has(currentTabHostname)) {
            currentState = "PlayPause";
        } else {
            currentState = "PreviewReport|ItHelped";
        }
    }

    async function clickDidntHelp() {
        adReport.data.functional = {
            pauseHelped: false,
        }

        // Remove exception
        exceptions.update(value => value.filter(e => e !== currentTabHostname));

        // Reload page
        let [currentTab] = await browser.tabs.query({active: true, currentWindow: true});
        browser.tabs.reload(currentTab.id);

        // Only offer to send a report if there are no ad reports for the current tab
        let adReportsForPage = await getAdReportsByDomains([currentTabHostname]);

        if (adReportsForPage.has(currentTabHostname)) {
            currentState = "PlayPause";
        } else {
            currentState = "PreviewReport|DidntHelp";
        }
    }

    async function clickSend() {
        currentState = "SendingReport";

        adReport.uuid = await uploadAdReport(adReport.data);

        currentState = "PlayPause";
    }

    async function clickNoSend() {
        currentState = "PlayPause";
    }


    function exceptionsChangedHandler(value) {
        // abort if exceptions hasn't been inititialized yet
        if (value === undefined) {
            return;
        }

        currentTabExempt = value.includes(currentTabHostname);
    }

    let previousTabHostname;
    let previousTabId;
    async function tabChangedHandler(tabId) {
        // update currentTabHostname
        let tabInfo;
        try {
            tabInfo = await browser.tabs.get(tabId);

            // Abort if the tab isn't the selected tab or belongs to a different window
            let currentWindow = await browser.windows.getCurrent();
            if (!tabInfo.selected || tabInfo.windowId !== currentWindow.id) {
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

        // Update currentTabExempt & currentState if url has changed
        if (previousTabId === undefined) {
            currentTabExempt = $exceptions?.includes(currentTabHostname) || false;
        } else {
            if (previousTabHostname !== currentTabHostname) {
                currentTabExempt = $exceptions?.includes(currentTabHostname) || false;
                currentState = "PlayPause";
            }
        }

        // disable on internal pages like chrome:// and about://
        disabled = false;
        for (let prefix of ["chrome://" , "about://"]) {
            if (tabInfo.url.startsWith(prefix)) {
                disabled = true;
                break;
            }
        }

        previousTabId = tabId;
        previousTabHostname = currentTabHostname;
    }


    onMount(async () => {
        exceptions.subscribe(exceptionsChangedHandler);

        let [currentTab] = await browser.tabs.query({active: true, currentWindow: true});

        await tabChangedHandler(currentTab?.id);

        browser.tabs.onActivated.addListener(event => tabChangedHandler(event.tabId));
        browser.tabs.onUpdated.addListener(event => tabChangedHandler(event));
        browser.tabs.onCreated.addListener(event => tabChangedHandler(event.id));
    });
</script>

<Heading tag="h4">
    {#if currentState === "PlayPause" && !currentTabExempt }
        Pause blocking on <Secondary class="ms-2">{currentTabHostname}</Secondary>?
    {:else if currentState === "PlayPause" && currentTabExempt }
        Restart blocking on <Secondary class="ms-2">{currentTabHostname}</Secondary>?
    {:else if currentState.split("|")[0] === "PreviewReport" }
        Send AdReport for <Secondary class="ms-2">{currentTabHostname}</Secondary>?
    {:else if currentState === "SendingReport" }
        Uploading AdReport for <Secondary class="ms-2">{currentTabHostname}</Secondary>
    {:else if currentState === "Ask" }
        Did it help?
    {/if}
</Heading>

<div class="flex flex-col space-y-2 py-2">
    {#if currentState === "PlayPause" && !currentTabExempt }
        <p>Problem with the page (no access, popups or similar)? Try <i>Pause</i> to see if it helps!</p>
        <p>Ads on the page? Click <i>Bug</i> to send a report!</p>
    {:else if currentState === "PlayPause" && currentTabExempt }
        <p>Blocking is paused. Click <i>Play</i> to restart blocking!</p>
    {:else if currentState === "PreviewReport|ItHelped" }
        <p>Great, let's keep the exception for now!</p>
        <p>You can send a report! If you do we'll fix the problem for you and you'll be able to continue blocking on this page!</p>
    {:else if currentState === "PreviewReport|DidntHelp" }
        <p>Too bad, we've removed the exception again!</p>
        <p>You can send a report! If you do we'll investigate and fix the problem for you!</p>
    {:else if currentState === "Ask" }
        <p>If it did (or if you want to disable blocking on this page) we'll keep this exception. Otherwhise we'll remove it again to make sure you remain protected on this page.</p>
    {/if}
</div>

<div class="grid grid-cols-2 py-4 space-x-2">
    {#if currentState === "PlayPause" && !currentTabExempt }

        <div class="text-right px-2">
            <Button disabled={disabled} pill={true} outline={true} class="!p-2" on:click={clickPause}>
                <PauseSolid class="w-10 h-10" />
            </Button>
        </div>
        <div class="px-2">
            <Button disabled={disabled} pill={true} outline={true} class="!p-2"  on:click={clickReport}>
                <BugOutline class="w-10 h-10" />
            </Button>
        </div>
    {:else if currentState === "PlayPause" && currentTabExempt }

        <div class="text-right px-2">
            <Button disabled={disabled} pill={true} outline={true} class="!p-2" on:click={clickPlay}>
                <PlaySolid class="w-10 h-10" />
            </Button>
        </div>
    {:else if currentState === "Ask" }
        <div class="text-right px-2">
            <Button disabled={disabled} pill={true} outline={true} class="!p-2"  on:click={clickItHelped}>
                <CheckOutline class="w-10 h-10" />
            </Button>
        </div>
        <div class="px-2">
            <Button disabled={disabled} pill={true} outline={true} class="!p-2"  on:click={clickDidntHelp}>
                <CloseOutline class="w-10 h-10" />
            </Button>
        </div>
    {:else if currentState.split("|")[0] === "PreviewReport" }
        <div class="text-right px-2">
            <Button disabled={disabled} pill={true} outline={true} class="!p-2"  on:click={clickSend}>
                <CheckOutline class="w-10 h-10" />
            </Button>
        </div>
        <div class="px-2">
            <Button disabled={disabled} pill={true} outline={true} class="!p-2"  on:click={clickNoSend}>
                <CloseOutline class="w-10 h-10" />
            </Button>
        </div>
    {:else if currentState === "SendingReport" }
        <div class="text-right px-2">
            <Spinner size={12} />
        </div>
    {/if}
</div>

{#if currentState.split("|")[0] === "PreviewReport" }
    {#if adReport.data}
        <AdReport {adReport} />
    {/if}
{/if}
