<script> 
    import {
        Button,
        Card,
        Navbar,
        NavUl,
        NavLi,
        NavBrand,
        NavHamburger,
        BottomNav,
        BottomNavItem
     } from 'flowbite-svelte';

    import {
        LinkOutline,
        MailBoxOutline,
        AdjustmentsHorizontalOutline,
    } from 'flowbite-svelte-icons';

    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';

    import { browser } from "/uBOLite/js/ext.js";

    import { UNPACKED } from "/src/js/consts.js";

    // XXX: Non background page using background page code
    import { getAdReports } from "/src/js/background/reportAd.js";

    import {
        getExceptions,
        addException,
        removeException,
    } from "/src/js/filters.js";

    import {
        ctrlblkHomepageUrl,
        ctrlblkContactUrl,
    } from "/src/js/consts.js";

    import Pause from "./Pause.svelte"
    import Exceptions from "./Exceptions.svelte";
    import Filterlists from "./Filterlists.svelte"
    import UpdatePage from './UpdatePage.svelte';

    let exceptions = writable();

    let adReports = writable([]);

    async function exceptionsChangedFilterHandler(value) {
        // abort if exceptions hasn't been inititialized yet
        if (value === undefined) {
            return;
        }

        let previousExceptions = await getExceptions();

        for (let exception of previousExceptions) {
            if (!value.includes(exception)) {
                removeException(exception);
            }
        }

        for (let exception of value) {
            if (!previousExceptions.includes(exception)) {
                addException(exception);
            }
        }
    }
    exceptions.subscribe(exceptionsChangedFilterHandler);

    async function openDevTools () {

        let flux = await browser.permissions.request({
            permissions: ["declarativeNetRequestFeedback"],
        })

        console.log(flux)

        let [currentTab] = await browser.tabs.query({active: true, currentWindow: true});

        let query = ''
        if (currentTab?.id) {
            let params = new URLSearchParams([["tabId", currentTab.id]])
            query = params.toString()
        }

        let windowId = await browser.windows.create({
            focused: true,
            url: `/src/devtools/index.html?${query}`
        })

    }

    onMount(async () => {
        exceptions.set(await getExceptions());

        adReports.set(await getAdReports());
    });
</script>

<Navbar>
    <NavBrand href="/">
        <img src="/images/logo/128.png" class="me-3 h-6 sm:h-9" alt="CtrlBlock Logo" />
        <span class="self-center whitespace-nowrap text-xl font-semibold dark:text-white">CtrlBlock</span>
    </NavBrand>

    {#if UNPACKED}
        <div class="flex md:order-2">
            <Button pill={true} outline={true} class="!p-2" on:click={openDevTools}>
                <AdjustmentsHorizontalOutline  class="w-6 h-6" />
            </Button>
        </div>
    {/if}
</Navbar>

<div class="mx-4 space-y-4">
    <Card style="max-width:100%;">
        <Pause {exceptions} />
    </Card>
    <Card style="max-width:100%;">
        <Exceptions {exceptions}/>
    </Card>
    <Card style="max-width:100%;">
        <Filterlists />
    </Card>

    {#if UNPACKED}
        <Card style="max-width:100%;">
            <UpdatePage />
        </Card>
    {/if}
</div>

<BottomNav position="sticky" classInner="max-w-sm grid-cols-2">
    <BottomNavItem btnName="Website" href="{ctrlblkHomepageUrl}" target="_blank">
        <LinkOutline class="w-5 h-5 mb-1 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-500" />
    </BottomNavItem>
    <BottomNavItem btnName="Contact" href="{ctrlblkContactUrl}" target="_blank">
        <MailBoxOutline class="w-5 h-5 mb-1 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-500" />
    </BottomNavItem>
</BottomNav>
