<script>
    import { 
        Button,
        Heading,
    } from 'flowbite-svelte';

    import {
        browser,
    } from "/uBOLite/js/ext.js";


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


        /*
        browser.tabs.create({
            url: `/src/devtoolspanel/index.html?${query}`
        });
        */
    }
</script>

<Heading tag="h4">Dev Tools</Heading>

<div class="text-right">
    <Button size="sm" on:click={clickDevTools}>Open Dev Tools</Button>
</div>
