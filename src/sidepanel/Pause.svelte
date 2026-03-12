<script>
    import Button from "/src/lib/ui/Button.svelte";
    import Spinner from "/src/lib/ui/Spinner.svelte";
    import { Play, Pause as PauseIcon, Check, X, Bug } from 'lucide-svelte';

    import { onMount } from 'svelte';

    import { browser } from "/src/js/lib/browser-api.js";

    // XXX: Non background page using background page code
    import { getAdReportsByDomains } from "/src/js/background/reportAd.js";

    import {
        createAdReportData,
        uploadAdReport
    } from "/src/js/reportAd.js";

    import AdReport from "./AdReport.svelte";

    let { exceptions } = $props();

    let disabled = $state(false);

    let currentTabHostname = $state("");
    let currentTabExempt = $state(false);

    let currentState = $state("PlayPause");

    let adReport = $state({});

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

<h3 class="text-sm font-medium text-zinc-900 dark:text-zinc-100">
    {#if currentState === "PlayPause" && !currentTabExempt }
        Pause blocking on <span class="font-normal text-zinc-400">{currentTabHostname}</span>
    {:else if currentState === "PlayPause" && currentTabExempt }
        Resume blocking on <span class="font-normal text-zinc-400">{currentTabHostname}</span>
    {:else if currentState.split("|")[0] === "PreviewReport" }
        Send report for <span class="font-normal text-zinc-400">{currentTabHostname}</span>?
    {:else if currentState === "SendingReport" }
        Uploading report&hellip;
    {:else if currentState === "Ask" }
        Did pausing help?
    {/if}
</h3>

<div class="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
    {#if currentState === "PlayPause" && !currentTabExempt }
        <p>Page broken? Try pausing. Seeing ads? Send a report.</p>
    {:else if currentState === "PlayPause" && currentTabExempt }
        <p>Blocking is paused on this site.</p>
    {:else if currentState === "PreviewReport|ItHelped" }
        <p>We'll keep the exception. Send a report and we'll fix the underlying issue for you.</p>
    {:else if currentState === "PreviewReport|DidntHelp" }
        <p>Exception removed. Send a report and we'll investigate.</p>
    {:else if currentState === "Ask" }
        <p>We'll keep the exception if it helped, or remove it to keep you protected.</p>
    {/if}
</div>

<div class="mt-4 flex items-center gap-3">
    {#if currentState === "PlayPause" && !currentTabExempt }
        <Button disabled={disabled} pill outline class="!p-2.5" onclick={clickPause} title="Pause blocking">
            <PauseIcon class="h-5 w-5" />
        </Button>
        <Button disabled={disabled} pill outline class="!p-2.5" onclick={clickReport} title="Report an issue">
            <Bug class="h-5 w-5" />
        </Button>
    {:else if currentState === "PlayPause" && currentTabExempt }
        <Button disabled={disabled} pill outline class="!p-2.5" onclick={clickPlay} title="Resume blocking">
            <Play class="h-5 w-5" />
        </Button>
    {:else if currentState === "Ask" }
        <Button disabled={disabled} pill outline class="!p-2.5" onclick={clickItHelped} title="Yes, it helped">
            <Check class="h-5 w-5" />
        </Button>
        <Button disabled={disabled} pill outline class="!p-2.5" onclick={clickDidntHelp} title="No, it didn't help">
            <X class="h-5 w-5" />
        </Button>
    {:else if currentState.split("|")[0] === "PreviewReport" }
        <Button disabled={disabled} pill outline class="!p-2.5" onclick={clickSend} title="Send report">
            <Check class="h-5 w-5" />
        </Button>
        <Button disabled={disabled} pill outline class="!p-2.5" onclick={clickNoSend} title="Cancel">
            <X class="h-5 w-5" />
        </Button>
    {:else if currentState === "SendingReport" }
        <Spinner size={6} />
    {/if}
</div>

{#if currentState.split("|")[0] === "PreviewReport" }
    {#if adReport.data}
        <div class="mt-4">
            <AdReport {adReport} />
        </div>
    {/if}
{/if}
