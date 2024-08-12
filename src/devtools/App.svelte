<script>
    import { onMount } from 'svelte';

    import { writable } from 'svelte/store';

    import {
        Navbar,
        NavBrand,
        BottomNav,
        BottomNavItem
     } from 'flowbite-svelte';

    import {
        LinkOutline,
        MailBoxOutline,
    } from 'flowbite-svelte-icons';


    import {
        ctrlblkHomepageUrl,
        ctrlblkContactUrl,
    } from "/src/js/consts.js";

    import {
        getDisabledRules,
        getRuleNeo,
        enableRules,
        disableRules,
        isStaticRuleset,
    } from '/src/js/rules.js';

    import FilterHits from './components/FilterHits.svelte';
    import CustomFilters from './components/CustomFilters.svelte'
    import DisabledFilters from './components/DisabledFilters.svelte';

    let tabId = writable(0)

    let disabledFilters, customFilters

    async function handleEnableRule({ detail : {rulesetId, ruleId} }) {
        console.log("handleEnableRule", ruleId, rulesetId)

        await enableRules({ rulesetId, enableRuleIds: [ruleId] })
        //disabledFilters.removeRule(rulesetId, ruleId)

    }

    async function handleDisableRule({ detail : {rulesetId, ruleId} }) {
        let rule = await getRuleNeo({ rulesetId, ruleId })

        if (isStaticRuleset(rulesetId)) {
            await disableRules({ rulesetId, disableRuleIds: [ruleId] })
            disabledFilters.addRule(rulesetId, rule)
        } else {
            console.log("non static ruleset")
            await customFilters.disableRule(rulesetId, rule)
        }
    }

    onMount(async () => {
        let disabledRules = await getDisabledRules()

        for (let [rulesetId, rules] of disabledRules) {
            for (let rule of rules.values()) {
                disabledFilters.addRule(rulesetId, rule)
            }
        }
    })
</script>

<Navbar>
    <NavBrand href="/">
        <img src="/images/logo/128.png" class="me-3 h-6 sm:h-9" alt="CtrlBlock Logo" />
        <span class="self-center whitespace-nowrap text-xl font-semibold dark:text-white">CtrlBlock</span>
    </NavBrand>
</Navbar>

<div class="mx-4 space-y-4">
    <CustomFilters {tabId} bind:this={customFilters} />
    <DisabledFilters on:enableRule={handleEnableRule} bind:this={disabledFilters} />
    <FilterHits on:disableRule={handleDisableRule} {tabId} />
</div>

<BottomNav position="sticky" classInner="max-w-sm grid-cols-2">
    <BottomNavItem btnName="Website" href="{ctrlblkHomepageUrl}" target="_blank">
        <LinkOutline class="w-5 h-5 mb-1 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-500" />
    </BottomNavItem>
    <BottomNavItem btnName="Contact" href="{ctrlblkContactUrl}" target="_blank">
        <MailBoxOutline class="w-5 h-5 mb-1 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-500" />
    </BottomNavItem>
</BottomNav>
