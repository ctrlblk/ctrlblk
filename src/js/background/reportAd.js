import { browser } from "/uBOLite/js/ext.js";

import { adReportUrl } from "/src/js/consts.js";

let adReportsCache;

export async function getLocalAdReportIds() {
    let { adReportIds } = await browser.storage.local.get({"adReportIds": []});
    return adReportIds;
}

export async function refreshAdReportsCache() {
    adReportsCache = undefined;
    await browser.storage.session.remove("adReportsSession");
    await getAdReports();
    return;
}

export async function getAdReports() {
    // Populate adReportsCache if it's not already populated
    if (adReportsCache === undefined) {
        let { adReportsSession } = await browser.storage.session.get("adReportsSession");
        adReportsCache = adReportsSession;
    }

    // Return adReportsCache if it's populated
    if (adReportsCache !== undefined) {
        return adReportsCache;
    }

    // Otherwise, fetch ad reports from the server
    let adReports = [];

    let localAdReportIds = await getLocalAdReportIds();

    for (let reportId of localAdReportIds) {
        let request = new Request(`${adReportUrl}/${reportId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json;charset=UTF-8"
            },
        });

        let response = await fetch(request);

        if (response.ok) {
            let report = await response.json();
            adReports.push(report);
        }

    }

    // Populate cache and session storage
    adReportsCache = adReports;
    await browser.storage.session.set({adReportsSession: adReports});

    return adReports;
}

export async function getAdReportsByDomains(domains) {
    let adReports = await getAdReports();

    let result = new Map();

    for (let report of adReports) {
        let url = new URL(report.data.page.url);

        if (domains.includes(url.hostname)) {
            let reports = result.get(url.hostname) || [];
            reports.push(report);
            result.set(url.hostname, reports);
        }
    }

    return result;
}

export async function clearLocalAdReportIds() {
    await browser.storage.local.set({adReportIds: []});
}