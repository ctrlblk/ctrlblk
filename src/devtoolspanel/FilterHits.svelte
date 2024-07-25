<script>

    import {
        TableSearch,
        TableBody,
        TableBodyCell,
        TableBodyRow,
        TableHead,
        TableHeadCell,
     } from 'flowbite-svelte';

    import { onMount } from 'svelte';

    import { browser } from "/uBOLite/js/ext.js"

    let searchTerm = ''
    let placeholder = 'Fileriooo'

    let data = []
    let rules

    async function getRules() {
        let rules = new Map()

        let res = await fetch("/rulesets/ruleset-details.json")
        let resJSON = await res.json()

        for (let { id } of resJSON) {
            let res = await fetch(`/rulesets/main/${id}.json`)
            let resJSON = await res.json()

            for (let rule of resJSON) {
                rules.set(rule.id, rule)
            }
        }
        return rules
    }


    async function getMatches(tabId) {
        let { rulesMatchedInfo: matches } =
            await browser.declarativeNetRequest.getMatchedRules({ tabId })

        console.log(matches)

        let result = []


        for (let { rule, tabId, timeStamp } of matches) {

            let ruleObj = rules.get(rule.ruleId)

            if (ruleObj.condition.requestDomains?.length > 10) {
                ruleObj.condition.requestDomains.splice(9)
                ruleObj.condition.requestDomains.push("...")

            }

            result.push({
                rule: JSON.stringify(ruleObj),
                ruleset: rule.rulesetId,
                time: new Date(timeStamp).toISOString(),
            })
        }

        console.log(result)

        return result
    }

    function ruleToFilter({ action, condition }, requestURL) {


        requestURL = new URL(requestURL)

        let parts = []

        if (action.type === "allow") {
            parts.push("@@")
        }

        if (condition.urlFilter) {
            parts.push(condition.urlFilter)
        }

        for (let requestDomain of condition.requestDomains || []) {

            if (requestURL.hostname === "js.adscale.de") {
                console.log(requestURL.hostname, requestDomain)
            }
            if (requestURL.hostname.endsWith(requestDomain)) {
                parts.push(`||${requestDomain}^`)
            }
        }

        let modifiers = []

        if (condition.resourceTypes) {
            modifiers.push(condition.resourceTypes.join(','))
        }

        if (condition.initiatorDomains) {
            modifiers.push(`domain=${condition.initiatorDomains.join('|')}`)
        }

        if (condition.domainType) {
            modifiers.push({
                thirdParty: "third-party",
            }[condition.domainType])
        }

        if (modifiers.length) {
            parts.push(`\$${modifiers.join(',')}`)
        }



        return parts.join("")

    }

    async function addMatches({ request, rule }) {


        //if (request.tabId === tabId

        let ruleObj = rules.get(rule.ruleId)

        let filter = ruleToFilter(JSON.parse(JSON.stringify(ruleObj)), request.url)

        /*
        if (ruleObj.condition.requestDomains?.length > 10) {
            ruleObj.condition.requestDomains.splice(9)
            ruleObj.condition.requestDomains.push("...")
        }
        */

        let bgColor = {
            block: "bg-red-400", 
            allow: "bg-green-400"
        }[ruleObj.action?.type] || "bg-amber-400"

        data.push({
            bgColor,
            filter,
            rule: JSON.stringify(ruleObj),
            ruleset: rule.rulesetId,
            time: new Date().toISOString(),

            requestURL: request.url,

        })

        data = data



        console.log(request, rule)
        console.log(data)

    }

    onMount(async () => {

        const urlParams = new URLSearchParams(window.location.search)
        const tabId = parseInt(urlParams.get('tabId'), 10) || null

        rules = await getRules()


        //data = await getMatches(tabId)

        browser.declarativeNetRequest.onRuleMatchedDebug.addListener(addMatches)
    })

</script>


<TableSearch
        searchClass="relative mt-1 float-left"
        placeholder="{placeholder}"
        hoverable={true}
        bind:inputValue={searchTerm}>
    <div slot="header" class="mt-1 float-right">
        <slot name="headerRight">
            <div class="px-8">
                <p>Flux</p>
            </div>
        </slot>
    </div>
    <TableHead>
        <TableHeadCell>Time</TableHeadCell>
        <TableHeadCell>Filter</TableHeadCell>
        <TableHeadCell>Ruleset</TableHeadCell>
        <TableHeadCell>Request URL</TableHeadCell>
    </TableHead>
    <TableBody tableBodyClass="divide-y">
        {#each data as row }
            <TableBodyRow class="{row.bgColor}">
                <TableBodyCell>{row.time}</TableBodyCell>
                <TableBodyCell>
                    {row.filter}
                    <div class="hidden">
                        {row.rule} 
                    </div>
                </TableBodyCell>
                <TableBodyCell>{row.ruleset}</TableBodyCell>
                <TableBodyCell>{row.requestURL}</TableBodyCell>
            </TableBodyRow>
        {/each}
    </TableBody>
</TableSearch>
