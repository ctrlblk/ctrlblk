<script>
    import { ExternalLink, Mail, Sun, Moon } from 'lucide-svelte';

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

    let dark = $state(document.documentElement.classList.contains('dark'));

    function toggleTheme() {
        dark = !dark;
        document.documentElement.classList.toggle('dark', dark);
        localStorage.setItem('theme', dark ? 'dark' : 'light');
    }

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

<div class="flex h-screen flex-col bg-white dark:bg-zinc-900">
    <header class="shrink-0 flex items-center gap-3 px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
        <img src="/images/logo/128.png" class="h-7" alt="CtrlBlock" />
        <span class="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">CtrlBlock</span>
        <button
            onclick={toggleTheme}
            class="ml-auto text-zinc-400 transition-colors hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            {#if dark}
                <Sun class="h-4 w-4" />
            {:else}
                <Moon class="h-4 w-4" />
            {/if}
        </button>
    </header>

    <main class="flex-1 overflow-y-auto divide-y divide-zinc-100 px-5 dark:divide-zinc-800">
        <section class="py-5">
            <Pause {exceptions} />
        </section>

        <section class="py-5">
            <Exceptions {exceptions} />
        </section>

        <section class="py-5">
            <Filterlists />
        </section>

        {#if UNPACKED}
            <section class="py-5">
                <UpdatePage />
            </section>
        {/if}
    </main>

    <footer class="shrink-0 border-t border-zinc-100 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div class="flex items-center justify-center gap-6 text-xs text-zinc-400 dark:text-zinc-500">
            <a href={ctrlblkHomepageUrl} target="_blank" class="inline-flex items-center gap-1.5 transition-colors hover:text-zinc-700 dark:hover:text-zinc-300">
                <ExternalLink class="h-3.5 w-3.5" />
                Website
            </a>
            <span class="text-zinc-300 dark:text-zinc-700">&middot;</span>
            <a href={ctrlblkContactUrl} target="_blank" class="inline-flex items-center gap-1.5 transition-colors hover:text-zinc-700 dark:hover:text-zinc-300">
                <Mail class="h-3.5 w-3.5" />
                Contact
            </a>
        </div>
    </footer>
</div>
