<script> 
    import Card from "/src/lib/ui/Card.svelte";
    import { ExternalLink, Mail } from 'lucide-svelte';

    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';

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

    onMount(async () => {
        exceptions.set(await getExceptions());

        adReports.set(await getAdReports());
    });
</script>

<nav class="border-b border-gray-200 bg-white px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800">
    <a href="/" class="flex items-center">
        <img src="/images/logo/128.png" class="me-3 h-6 sm:h-9" alt="CtrlBlock Logo" />
        <span class="self-center whitespace-nowrap text-xl font-semibold dark:text-white">CtrlBlock</span>
    </a>
</nav>

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

<div class="fixed bottom-0 left-0 z-50 h-16 w-full border-t border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-700">
    <div class="mx-auto grid h-full max-w-sm grid-cols-2">
        <a href={ctrlblkHomepageUrl} target="_blank" class="group inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-gray-800">
            <ExternalLink class="w-5 h-5 mb-1 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-500" />
            <span class="text-sm text-gray-500 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-500">Website</span>
        </a>
        <a href={ctrlblkContactUrl} target="_blank" class="group inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 dark:hover:bg-gray-800">
            <Mail class="w-5 h-5 mb-1 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-500" />
            <span class="text-sm text-gray-500 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-500">Contact</span>
        </a>
    </div>
</div>
