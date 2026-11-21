<script>
    import {
        Button,
        Heading,
        Secondary,
    } from 'flowbite-svelte';

    import {
        PlaySolid,
        PauseSolid,
        CheckOutline,
        CloseOutline,
    } from 'flowbite-svelte-icons';

    import { onMount } from 'svelte';

    import { browser } from "/src/js/lib/browser-api.js";

    export let exceptions;

    let disabled = false;

    let currentTabHostname = "";
    let currentTabExempt = false;

    let currentState = "PlayPause";

    async function clickPause() {
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

    async function clickItHelped() {
        // Keep the exception
        currentState = "PlayPause";
    }

    async function clickDidntHelp() {
        // Remove exception
        exceptions.update(value => value.filter(e => e !== currentTabHostname));

        // Reload page
        let [currentTab] = await browser.tabs.query({active: true, currentWindow: true});
        browser.tabs.reload(currentTab.id);

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
    {:else if currentState === "Ask" }
        Did it help?
    {/if}
</Heading>

<div class="flex flex-col space-y-2 py-2">
    {#if currentState === "PlayPause" && !currentTabExempt }
        <p>Problem with the page (no access, popups or similar)? Try <i>Pause</i> to see if it helps!</p>
    {:else if currentState === "PlayPause" && currentTabExempt }
        <p>Blocking is paused. Click <i>Play</i> to restart blocking!</p>
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
    {/if}
</div>

