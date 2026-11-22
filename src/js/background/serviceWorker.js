"use strict";

import { browser, runtime, dnr } from "/src/js/lib/browser-api.js";

import filters from "/src/js/background/filters.js";
import { removeAdReportData } from "/src/js/background/adReportCleanup.js";

const messageHandlers = {
    insertCSS: insertCSSHandler,
};

async function insertCSSHandler(request, sender) {
    const { css } = request;

    const tabId = sender?.tab?.id;
    const frameId = sender?.frameId ?? 0;

    if ( typeof tabId === 'number' ) {
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

    if (Object.hasOwn(messageHandlers, what)) {
        const messageHandler = messageHandlers[what];
        messageHandler(request, sender).then(sendResponse).catch(error => {
            console.error(`Message handler '${what}' failed:`, error);
            sendResponse(false);
        });
        return true;
    }
}

async function onInstalledHandler(details) {
    return removeAdReportData(details, browser.storage);
}

async function start() {
    // Register onInstalled early in order to not miss it
    runtime.onInstalled.addListener(onInstalledHandler);

    let [, wakeupRun] = await filters.initRulesetConfig();

    runtime.onMessage.addListener(filters.filtersMessageHandler);
    runtime.onMessage.addListener(onMessage);

    await browser.sidePanel.setPanelBehavior({openPanelOnActionClick: true});

    if ( wakeupRun === false && dnr.setExtensionActionOptions ) {
        dnr.setExtensionActionOptions({ displayActionCountAsBadgeText: true });
    }
}

start();