<script>
    import { onMount } from 'svelte'

    import { 
        Button,
        Table,
        TableHead,
        TableHeadCell,
        TableBody,
        TableBodyRow,
        TableBodyCell,
        Textarea,
    } from 'flowbite-svelte'

    import { browser } from '/uBOLite/js/ext.js'


    import { dnrRulesetFromRawLists } from '/uBOBits/static-dnr-filtering.js';
    import redirectResourcesMap from '/uBOBits/redirect-resources.js';

    import RuleCheckbox from "../devtools/RuleCheckbox.svelte"

    import { ruleToFilter } from "/src/js/rules.js";


    let data = []
    let value = ''

    async function parseRules(rules) {
        let lists = [{
            name: "Session Rules",
            text: rules
        }]

        // Build list of available web accesible resources
        const extensionPaths = [];
        for ( const [ fname, details ] of redirectResourcesMap ) {
            const path = `/web_accessible_resources/${fname}`;
            extensionPaths.push([ fname, path ]);
            if ( details.alias === undefined ) { continue; }
            if ( typeof details.alias === 'string' ) {
                extensionPaths.push([ details.alias, path ]);
                continue;
            }
            if ( Array.isArray(details.alias) === false ) { continue; }
            for ( const alias of details.alias ) {
                extensionPaths.push([ alias, path ]);
            }
        }

        const options = {
            env: [
                'chromium',
                'mv3',
                'ublock',
                'ubol',
                'user_stylesheet',
                'native_css_has'
            ],
            extensionPaths,
            //secret: ruleset.secret,
            good: new Set(),
            bad: new Set(),
            invalid: new Set(),
            filterCount: 0,
            acceptedFilterCount: 0,
            rejectedFilterCount: 0,
        }

        let results = await dnrRulesetFromRawLists(lists, options);

        return results

    }

    async function applyRules(rules) {

        let results = await parseRules(rules)
        console.log(results)

        let { network: { ruleset: dnr } } = results


        console.log(dnr)

        await browser.declarativeNetRequest.updateSessionRules({ addRules: dnr })
    }

    async function applyFilters(event) {

        console.log(event, value)
    }


    onMount(async () => {

        //let results = applyRules("heise.cloudimg.io")


        let rules = await browser.declarativeNetRequest.getSessionRules()

        let _data = []
        for (let rule of rules) {

            _data.push({
                ruleId: rule.id,
                rulesetId: browser.declarativeNetRequest.SESSION_RULESET_ID,
                filter: ruleToFilter(rule),
                rawRule: rule,
            }) 
        }

        data = _data

        console.log(rules)
        


    })
</script>


    <Table>

        <TableHead>
            <TableHeadCell>Enabled</TableHeadCell>
            <TableHeadCell>Filter</TableHeadCell>
        </TableHead>

        
        <TableBody tableBodyClass="divide-y">
            {#each data as row}
                
                <TableBodyRow>
                    <TableBodyCell class="!p-4">
                        <RuleCheckbox ruleId={row.ruleId} rulesetId={row.rulesetId} />
                    </TableBodyCell>
                    <TableBodyCell>
                        {row.filter}
                    </TableBodyCell>
                </TableBodyRow>
            {/each}
        </TableBody>
    </Table>


<Textarea bind:value={value} />
<Button size="sm" on:click={applyFilters}>Apply</Button>
