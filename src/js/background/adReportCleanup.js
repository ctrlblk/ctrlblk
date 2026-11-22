"use strict";

// Ad reports were removed in 0.6.0. Remove the data older versions left behind.
export async function removeAdReportData(details, storage) {
    if (details.reason !== "update") {
        return;
    }
    await storage.local.remove("adReportIds");
    await storage.session.remove("adReportsSession");
}
