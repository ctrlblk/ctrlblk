import punycode from "punycode.js";

import {
    getFilteringModeDetails,
    setFilteringMode,
    MODE_NONE,
    MODE_COMPLETE,
} from '/uBOLite/js/mode-manager.js';

import {
    getRulesetDetails,
    enableRulesets,
 } from "/uBOLite/js/ruleset-manager.js";

import { 
    browser,
    dnr,
    sessionRead,
    sessionWrite,
    localRead,
    localWrite,
    runtime,
 } from "/uBOLite/js/ext.js";

 import { registerInjectables } from "/uBOLite/js/scripting-manager.js";

 import { detect } from "detect-browser";

 const rulesetConfig = {
    version: "",
    enabledRulesets: [],
    autoReload: true,
};

let firstRun = false;
let wakeupRun = false;


async function getDefaultRulesets() {
    let enabled = ["default", "ctrlblk"];

    let rulesetDetails = await getRulesetDetails();

    // Create a list of unique languages from the accept languages
    // Note we use i18n.getAcceptLanguages instead of navigator.languages
    // because it returns all languges not just the ui language, see:
    // https://github.com/w3c/webextensions/issues/107#issuecomment-1304420718
    let acceptLanguages = [... new Set(
        (await browser.i18n.getAcceptLanguages()).map(lang => lang.split("-")[0]))];

    for (let [id, details] of rulesetDetails.entries()) {
        for (let lang of (details.lang ?? "").split(" ")) {
            if (acceptLanguages.includes(lang)) {
                filters.enableFilterlist(id);
            }
        }
    }

    return enabled;
}

async function loadRulesetConfig() {
    let data = await sessionRead('rulesetConfig');
    if ( data ) {
        rulesetConfig.version = data.version;
        rulesetConfig.enabledRulesets = data.enabledRulesets;
        rulesetConfig.autoReload = data.autoReload && true || false;
        wakeupRun = true;
        return;
    }

    data = await localRead('rulesetConfig');
    if ( data ) {
        rulesetConfig.version = data.version;
        rulesetConfig.enabledRulesets = data.enabledRulesets;
        rulesetConfig.autoReload = data.autoReload && true || false;
        sessionWrite('rulesetConfig', rulesetConfig);
        return;
    }

    rulesetConfig.enabledRulesets = await getDefaultRulesets();
    sessionWrite('rulesetConfig', rulesetConfig);
    localWrite('rulesetConfig', rulesetConfig);
    firstRun = true;
}

async function saveRulesetConfig() {
    sessionWrite('rulesetConfig', rulesetConfig);
    return localWrite('rulesetConfig', rulesetConfig);
}


export async function initRulesetConfig() {
    await loadRulesetConfig();

    if (wakeupRun === false) {
        setFilteringMode('all-urls', MODE_COMPLETE);
        registerInjectables();
    }
    enableRulesets(rulesetConfig.enabledRulesets);

    return [firstRun, wakeupRun];
}

export async function isExempt(hostname) {
    hostname = punycode.toASCII(hostname);
    let hostnameParts = hostname.split(".");

    let exceptions = await getExceptions();
    exceptions = exceptions.map(punycode.toASCII);

    while (hostnameParts.length > 0) {
        let hostnameTest = hostnameParts.join(".");
        if (exceptions.includes(hostnameTest)) {
            return true;
        }
        hostnameParts.shift();
    }
    return false;
}

export async function getExceptions() {
    let filteringModeDetails = await getFilteringModeDetails();
    return Array.from(filteringModeDetails.none).map(punycode.toUnicode);
}

export async function addException(hostname) {
    hostname = punycode.toASCII(hostname);
    await setFilteringMode(hostname, MODE_NONE);
    await registerInjectables();
    return true;
}

export async function removeException(hostname) {
    hostname = punycode.toASCII(hostname);
    await setFilteringMode(hostname, MODE_COMPLETE);
    await registerInjectables();
    return true;
}

export async function updateExceptionsFromString(hostnames) {
    let existingExceptions = await getExceptions();
    let newExceptions = [];

    for (let line of hostnames.split(/\s/)) {
        try {
            let url = new URL(`https://${line}/`);
            newExceptions.push(punycode.toASCII(url.hostname));
        } catch (error) {
            console.log(`Error parsing "${line}""`, error);
        }
    }

    for (let hostname of existingExceptions) {
        if (!newExceptions.includes(hostname)) {
            await removeException(hostname);
        }
    }

    for (let hostname of newExceptions) {
        if (!existingExceptions.includes(hostname)) {
            await addException(hostname);
        }
    }

    await registerInjectables();
    return true;
}

export async function getFilterlistDetails() {
    const rulesetDetails = await getRulesetDetails();
    const enabledRulesets = await dnr.getEnabledRulesets();

    for (const [id, rule] of rulesetDetails) {
        if (enabledRulesets.includes(rule.id)) {
            rule.enabled = true;
        } else {
            rule.enabled = false;
        }
    }

    return Array.from(rulesetDetails);
}

async function updateEnabledFilterlist(id, enable) {
    let filterlistDetails = await getFilterlistDetails();
    filterlistDetails = new Map(filterlistDetails);

    let filterlist = filterlistDetails.get(id)
    if (filterlist.enabled !== enable) {
        filterlist.enabled = enable;

        let enabledRulesets = [];
        for (const [id, rule] of filterlistDetails) {
            if (rule.enabled) {
                enabledRulesets.push(id);
            }
        }

        rulesetConfig.enabledRulesets = enabledRulesets;

        await enableRulesets(enabledRulesets);
        await registerInjectables();
        await saveRulesetConfig();
    }

    return true;
}

export async function enableFilterlist(id) {
    await updateEnabledFilterlist(id, true);
    return true
}

export async function disableFilterlist(id) {
    await updateEnabledFilterlist(id, false);
    return true
}

export async function getConfiguration() {
    let extension = {version: runtime.getManifest().version};
    let browser = detect();
    let exceptions = await getExceptions();

    return {
        configuration: {
            rulesetConfig,
            exceptions,
        },
        meta: {
            browser,
            extension,
        }
    };
}

export function filtersMessageHandler(request, sender, sendResponse) {
    let { key, args } = request;

    if (key == undefined) {
        // Message is not for us
        return false;
    }

    if (args === undefined) {
        args = [];
    }

    if (filters.hasOwnProperty(key)) {
        const messageHandler = filters[key];
        messageHandler(...args).then(sendResponse);
        return true;
    }
    throw new Error(`Message handler with key ${key} doesn't exist!`);
}

const filters = {
    initRulesetConfig,
    isExempt,
    getExceptions,
    addException,
    removeException,
    updateExceptionsFromString,
    getFilterlistDetails,
    enableFilterlist,
    disableFilterlist,
    filtersMessageHandler,
    getConfiguration,
}

export default filters;
