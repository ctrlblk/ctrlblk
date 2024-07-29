<script>
    import {
        Button,
        TableSearch,
        TableBody,
        TableHead,
        TableHeadCell,
        Label,
        Select,
     } from 'flowbite-svelte';

    import {
        RefreshOutline,
    } from 'flowbite-svelte-icons';

    import { onMount } from 'svelte';

    import { browser } from "/uBOLite/js/ext.js"

    import {
        getRules,
        ruleToFilter,
    } from "./rules.js"

    import FilterHitRow from "./FilterHitRow.svelte"

    let searchTerm = ''
    let placeholder = 'Filer'

    let dataAvailable = []
    let dataVisible = []
    let rules

    let open = []

    let tabId
    let tabs
    let tabsSelect

    async function addMatches({ request, rule }) {
        if (request.tabId == tabId) {
            let ruleObj = rules.get(rule.ruleId)

            let filter = ruleToFilter(ruleObj, request.url)

            let bgColor = {
                block: "bg-red-400", 
                allow: "bg-green-400",
                allowAllRequests: "bg-green-400",
            }[ruleObj.action?.type] || "bg-amber-400"

            let tabTitle = request.tabId
            for (let tab of await browser.tabs.query({ url: "*://*/*" })) {
                if (tab.id === request.tabId) {
                    tabTitle = tab.title
                    break
                }
            }

            dataAvailable.push({
                bgColor,
                filter,
                ruleId: rule.ruleId,
                rulesetId: rule.rulesetId,
                time: new Date().toISOString(),

                tabTitle,
                requestURL: request.url,
            })

            // XXX: trigger reactivity
            dataAvailable = dataAvailable
        }
    }

    onMount(async () => {
        const urlParams = new URLSearchParams(window.location.search)
        let requestedTabId = parseInt(urlParams.get('tabId'), 10) || null


        tabs = await browser.tabs.query({ url: "*://*/*" })

        for (let tab of tabs) {
            if (tab.id === requestedTabId) {
                tabId = tab.id
                break
            }
        }

        tabsSelect = tabs.map((tab) => ({ name: tab.title, value: tab.id}))

        console.log("onMount", tabId, tabsSelect)

        rules = await getRules()

        browser.declarativeNetRequest.onRuleMatchedDebug.addListener(addMatches)
    })

    async function refreshTab() {
        await browser.tabs.reload(tabId, { bypassCache: true })

        dataAvailable = []
        dataVisible = []
    }

    $: dataVisible = dataAvailable.filter((entry) =>
        JSON.stringify(entry).toLowerCase().includes(searchTerm.toLowerCase()))

</script>


<TableSearch
        searchClass="relative mt-1 float-left"
        placeholder="{placeholder}"
        hoverable={true}
        bind:inputValue={searchTerm}>
    <div slot="header" class="mt-1 float-right">
        <slot name="headerRight">
            <div class="px-8">
                <Select class="float-left" items={tabsSelect} bind:value={tabId} />
                <Button pill={true} outline={true} class="float-right !p-2" on:click={refreshTab}>
                    <RefreshOutline class="w-6 h-6" />
                </Button>
            </div>
        </slot>
    </div>
    <TableHead>
        <TableHeadCell>Time</TableHeadCell>
        <TableHeadCell>Filter</TableHeadCell>
        <TableHeadCell>Ruleset</TableHeadCell>
        <TableHeadCell>Tab</TableHeadCell>
        <TableHeadCell>Request URL</TableHeadCell>
    </TableHead>
    <TableBody tableBodyClass="divide-y">
        {#each dataVisible as row, i }
            <FilterHitRow row={row} />
        {/each}
    </TableBody>
</TableSearch>
