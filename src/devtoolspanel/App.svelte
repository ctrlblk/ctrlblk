<script>
    import {
        Card,
        Navbar,
        NavBrand,
        BottomNav,
        BottomNavItem
     } from 'flowbite-svelte';

    import {
        LinkOutline,
        MailBoxOutline,
    } from 'flowbite-svelte-icons';

    import { onMount } from 'svelte';

    import {
        ctrlblkHomepageUrl,
        ctrlblkContactUrl,
    } from "/src/js/consts.js";

    import FilterHits from './FilterHits.svelte';


</script>


<Navbar>
    <NavBrand href="/">
        <img src="/images/logo/128.png" class="me-3 h-6 sm:h-9" alt="CtrlBlock Logo" />
        <span class="self-center whitespace-nowrap text-xl font-semibold dark:text-white">CtrlBlock</span>
    </NavBrand>
</Navbar>

<div class="mx-4 space-y-4">
    <FilterHits />
</div>

<BottomNav position="sticky" classInner="max-w-sm grid-cols-2">
    <BottomNavItem btnName="Website" href="{ctrlblkHomepageUrl}" target="_blank">
        <LinkOutline class="w-5 h-5 mb-1 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-500" />
    </BottomNavItem>
    <BottomNavItem btnName="Contact" href="{ctrlblkContactUrl}" target="_blank">
        <MailBoxOutline class="w-5 h-5 mb-1 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-500" />
    </BottomNavItem>
</BottomNav>
