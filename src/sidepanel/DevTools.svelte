<script>
    import { onMount } from 'svelte';

    import { writable } from 'svelte/store';

    import { 
        Button,
        Heading,
        Table,
        TableBody,
        TableBodyRow,
        TableBodyCell,
    } from 'flowbite-svelte';


    import { browser } from "/uBOLite/js/ext.js";

    import { config } from "/src/js/broadcast.js";

    import {
        getRules,
        ruleToFilter,
    } from "/src/js/rules.js";

    import EnableRule from "./EnableRule.svelte"


    let disabledRules = writable([])


    async function clickDevTools() {

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
            url: `/src/devtoolspanel/index.html?${query}`
        })
    }


    onMount(async () => {

        for (let rulesetId of await browser.declarativeNetRequest.getEnabledRulesets()) {
            let disableRuleIds = await browser.declarativeNetRequest.getDisabledRuleIds({ rulesetId }) 
            let rules = await getRules({ ruleIds: disableRuleIds, rulesetIds: [rulesetId] })
            for (let ruleId of disableRuleIds) {
                disabledRules.update((rls) => [...rls, { ruleId, rulesetId, filter: ruleToFilter(rules.get(ruleId)) }])
            }
        }

        config.addEventListener("message", async ({ data }) => {
            let { key, value: { rulesetId, disableRuleIds }} = data

            if (key === "updateStaticRules" && disableRuleIds) {
                let rules = await getRules({ ruleIds: disableRuleIds })
                for (let ruleId of disableRuleIds) {
                    disabledRules.update((rls) => [...rls, { ruleId, rulesetId, filter: ruleToFilter(rules.get(ruleId)) }])
                }
            }
        })
    })

</script>

<Heading tag="h4">Dev Tools</Heading>

<div class="text-right">
    <Table>

        <TableBody>
            {#each $disabledRules as rule}
                <TableBodyRow>
                    <TableBodyCell>
                        { rule.ruleId }
                    </TableBodyCell>
                    <TableBodyCell>
                        { rule.filter }
                    </TableBodyCell>
                    <TableBodyCell>
                        { rule.rulesetId }
                    </TableBodyCell>
                    <TableBodyCell class="text-right w-5">
                        <EnableRule { rule } { disabledRules } />
                    </TableBodyCell>
                </TableBodyRow>
            {/each}
        </TableBody>
    </Table>
    <Button size="sm" on:click={clickDevTools}>Open Dev Tools</Button>
</div>
