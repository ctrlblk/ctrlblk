<script>
    import {
        Button,
        Heading,
        Secondary,
    } from 'flowbite-svelte';

    import {
        PlaySolid,
        PauseSolid,
    } from 'flowbite-svelte-icons';

    import { onMount } from 'svelte';

    import { browser } from "/src/js/lib/browser-api.js";

    export let exceptions;

    let disabled = false;

    let currentTabHostname = "";
    let currentTabExempt = false;

    async function clickPause() {
        // Add exception
        if (!$exceptions.includes(currentTabHostname)) {
            exceptions.update(value => [...value, currentTabHostname]);
        }

        // Reload page
        let [currentTab] = await browser.tabs.query({active: true, currentWindow: true});
        browser.tabs.reload(currentTab.id);
    }

    async function clickPlay() {
        // Remove exception
        exceptions.update(value => value.filter(e => e !== currentTabHostname));

        // Reload page
        let [currentTab] = await browser.tabs.query({active: true, currentWindow: true});
        browser.tabs.reload(currentTab.id);
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

        // Update currentTabExempt if url has changed
        if (previousTabId === undefined || previousTabHostname !== currentTabHostname) {
            currentTabExempt = $exceptions?.includes(currentTabHostname) || false;
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
    {#if currentTabExempt }
        Restart blocking on <Secondary class="ms-2">{currentTabHostname}</Secondary>?
    {:else}
        Pause blocking on <Secondary class="ms-2">{currentTabHostname}</Secondary>?
    {/if}
</Heading>

<div class="flex flex-col space-y-2 py-2">
    {#if currentTabExempt }
        <p>Blocking is paused. Click <i>Play</i> to restart blocking!</p>
    {:else}
        <p>Problem with the page (no access, popups or similar)? Click <i>Pause</i> to stop blocking on this site.</p>
    {/if}
</div>

<div class="flex justify-center py-4">
    {#if currentTabExempt }
        <Button disabled={disabled} pill={true} outline={true} class="!p-2" on:click={clickPlay}>
            <PlaySolid class="w-10 h-10" />
        </Button>
    {:else}
        <Button disabled={disabled} pill={true} outline={true} class="!p-2" on:click={clickPause}>
            <PauseSolid class="w-10 h-10" />
        </Button>
    {/if}
</div>
