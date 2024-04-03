"use strict";

import { browser, runtime, dnr } from "/uBOLite/js/ext.js";

import filters from "/src/js/background/filters.js";
import {
    getLocalAdReportIds,
    clearLocalAdReportIds,
} from "/src/js/background/reportAd.js";

import { updateUrl } from "/src/js/consts.js";

const messageHandlers = {
    insertCSS: insertCSSHandler,
};

async function insertCSSHandler(request, sender) {
    const { css } = request;

    const tabId = sender?.tab?.id ?? false;
    const frameId = sender?.frameId ?? false;

    if (tabId && frameId) {
        try {
            await browser.scripting.insertCSS({
                css: css,
                origin: 'USER',
                target: { tabId, frameIds: [ frameId ] }
            });
        } catch (error) {
            console.log(`Error insertingCSS: (${JSON.stringify(error)})`);
        }
    }
    return false;
}

function onMessage(request, sender, sendResponse) {
    let { what } = request;

    if (what == undefined) {
        // Message is not for us
        return false;
    }

    if (messageHandlers.hasOwnProperty(what)) {
        const messageHandler = messageHandlers[what];
        messageHandler(request, sender).then(sendResponse);
        return true;
    }
    throw new Error(`Message handler with what ${what} doesn't exist!`);
}

async function onInstalledHandler(details) {
    console.log("onInstalled", details);

    // Collect and assemble data to be sent to the update server
    let config = await filters.getConfiguration();

    // Retrieve and clear local ad reports
    let adReportIds = await getLocalAdReportIds();
    await clearLocalAdReportIds();

    let adReportsFixedResponse = await fetch("assets/ad-reports.json");
    let adReportsFixed = await adReportsFixedResponse.json();

    let data = {
        version: "0.1",

        installed_reason: {
            reason: details.reason,
            previous_version: details.previousVersion,
        },

        ad_reports: {
            ad_reports: adReportIds,
            ad_reports_fixed: adReportsFixed.uuids,
        },

        ...config,
    }

    // Send data to the update server and open update page if desired
    let request = new Request(updateUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json;charset=UTF-8"
        },
        body: JSON.stringify(data),
    });

    let response = await fetch(request);

    if (response.ok) {
        let responseData = await response.json();

        // open update page?
        if (responseData.open_update_page) {
            browser.tabs.create({url: responseData.update_url});
        }
    }
}

async function start() {
    // Register onInstalled early in order to not miss it
    runtime.onInstalled.addListener(onInstalledHandler);

    let [firstRun, wakeupRun] = await filters.initRulesetConfig();

    runtime.onMessage.addListener(filters.filtersMessageHandler);
    runtime.onMessage.addListener(onMessage);

    await browser.sidePanel.setPanelBehavior({openPanelOnActionClick: true});

    if ( wakeupRun === false && dnr.setExtensionActionOptions ) {
        dnr.setExtensionActionOptions({ displayActionCountAsBadgeText: true });
    }

    //runtime.openOptionsPage();
}

try {
    start();
} catch (error) {
    console.trace(error);
}