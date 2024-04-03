import filters from "/src/js/filters.js";

import { browser } from '/uBOLite/js/ext.js';

// XXX: Code from background page
import { refreshAdReportsCache } from '/src/js/background/reportAd.js';

import { getUploadUrlUrl } from '/src/js/consts.js';

async function getUploadUrl() {
    let response = await fetch(getUploadUrlUrl);
    let responseJSON = await response.json();
    let url = new URL(responseJSON.url);
    return [url.pathname.split("/adreports/")[1], url];
}

export async function createAdReportData(image) {
    let config = await filters.getConfiguration();

    let [currentTab] = await browser.tabs.query({active: true});

    let data = {
        version: "0.1",
        page: {
          url: currentTab.url,
          datetime: new Date().toISOString(),
        },
        screenshot: image,
    }

    data = {...data, ...config};
    return data;
}

async function storeAdReportId(reportId) {
    let { adReportIds } = await browser.storage.local.get({"adReportIds": []});
    adReportIds.push(reportId);
    await browser.storage.local.set({adReportIds});
    await refreshAdReportsCache();
}

export async function uploadAdReport(data) {
    let [reportId, uploadUrl] = await getUploadUrl();

    let request = new Request(uploadUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json;charset=UTF-8"
        },
        body: JSON.stringify(data),
    });

    let response = await fetch(request);

    if (!response.ok) {
        throw new Error(`Failed to upload ad report: ${response.statusText}`);
    }

    await storeAdReportId(reportId);

    return reportId;
}