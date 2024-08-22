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

 import {
    splitSpecificCosmetic,
    generateFourPieceScriptletInner,
} from '/build/rulesets/scriptlets.js';


import * as makeScriptlet from '/uBOBits/make-scriptlets.js'

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
    console.log("getExceptions", filteringModeDetails.none)
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
    console.log("background", "getFilterlistDetails")

    const rulesetDetails = await getRulesetDetails();
    const enabledRulesets = await dnr.getEnabledRulesets();

    for (const [id, rule] of rulesetDetails) {
        if (enabledRulesets.includes(rule.id)) {
            rule.enabled = true;
        } else {
            rule.enabled = false;
        }
    }
    console.log("background", "getFilterlistDetails", rulesetDetails)

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

/// XXX: this uBOLite/js/ext.js has localRemove but no sessionRemove
async function sessionRemove(key) {
    if ( browser.storage instanceof Object === false ) { return; }
    if ( browser.storage.session instanceof Object === false ) { return; }
    return browser.storage.session.remove(key);
}

export async function addRuntimeScriptingFilters(details) {
    let keys = [
        "genericCosmetic",
        "genericCosmeticExceptions",
        "scriptlet",
        "specificCosmetic",
    ]
    for (let key of keys ) {
        let value = details[key]

        if (value) {
            sessionWrite(`scriptingFilters.${key}`, value)
        } else {
            sessionRemove(`scriptingFilters.${key}`)
        }

        if (key === "scriptlet") {
            registerRuntimeScriptletContentScript(new Map(value))
        }
    }
}

export async function getRuntimeScriptingGenericCosmeticFilters(request, sender) {
    let dataGenericCosmetic = await sessionRead("scriptingFilters.genericCosmetic");
    let filters = new Map(dataGenericCosmetic)


    let dataGenericCosmeticExceptions = await sessionRead("scriptingFilters.genericCosmeticExceptions");
    let exceptions = new Set(dataGenericCosmeticExceptions)

    console.log("getGenericSelectorMap filters", filters)
    console.log("getGenericSelectorMap exceptions", exceptions)


    let selectorList = [];

    if (filters) {
        for (let [hash, selectors] of filters) {
            // Remove exceptions
            if (exceptions) {
                selectors = selectors.filter(v => exceptions.has(v) === false);
            }

            // Format selectors to be injected into css-generic.js scriptlet below
            selectorList.push([hash, selectors.join(", ")]);
        }
    }

    return {
        toImport: selectorList,
    }
}

export async function getRuntimeScriptingSpecificCosmeticFilters(request, sender) {
    let data = await sessionRead("scriptingFilters.specificCosmetic");

    let specificCosmetic = new Map(data)

    let [declarativeCosmetic, _] = splitSpecificCosmetic(specificCosmetic);

    console.log("getSpecificImports declarativeCosmetic", declarativeCosmetic)

    let {argsList, hostnamesMap, entitiesMap, exceptionsMap} = generateFourPieceScriptletInner(declarativeCosmetic, true)

    let response = {
        argsList,
        hostnamesMap: Array.from(hostnamesMap.entries()),
        entitiesMap: Array.from(entitiesMap.entries()),
        exceptionsMap: Array.from(exceptionsMap.entries()),
    }

    console.log("getSpecificImports", response)
    return response
}

export async function getRuntimeScriptingDeclarativeFilters(request, sender) {

    let data = await sessionRead("scriptingFilters.specificCosmetic");

    let specificCosmetic = new Map(data)

    let [_, proceduralCosmetic] = splitSpecificCosmetic(specificCosmetic);

    // Strip all not cssable entries
    let proceduralDeclarative = new Map();
    for (let [jsonSelector, details] of proceduralCosmetic) {
        let selector = JSON.parse(jsonSelector);
        if (selector.cssable) {
            selector.cssable = undefined;
            proceduralDeclarative.set(JSON.stringify(selector), details);
        }
    }

    console.log("getDeclarativeImports proceduralDeclarative", proceduralDeclarative)

    let {argsList, hostnamesMap, entitiesMap, exceptionsMap} = generateFourPieceScriptletInner(proceduralDeclarative, false)

    let response = {
        argsList,
        hostnamesMap: Array.from(hostnamesMap.entries()),
        entitiesMap: Array.from(entitiesMap.entries()),
        exceptionsMap: Array.from(exceptionsMap.entries()),
    }

    console.log("getProceduralImports", response)
    return response
}

export async function getRuntimeScriptingProceduralFilters(request, sender) {

    let data = await sessionRead("scriptingFilters.specificCosmetic");

    let specificCosmetic = new Map(data)

    let [declarativeCosmetic, proceduralCosmetic] = splitSpecificCosmetic(specificCosmetic);

    let proceduralProcedural = new Map();
    for (let [jsonSelector, details] of proceduralCosmetic) {
        let selector = JSON.parse(jsonSelector);
        if (!selector.cssable) {
            proceduralProcedural.set(JSON.stringify(selector), details);
        }
    }

    console.log("getProceduralImports proceduralProcedural", proceduralProcedural)

    let {argsList, hostnamesMap, entitiesMap, exceptionsMap} = generateFourPieceScriptletInner(proceduralProcedural, false)

    let response = {
        argsList,
        hostnamesMap: Array.from(hostnamesMap.entries()),
        entitiesMap: Array.from(entitiesMap.entries()),
        exceptionsMap: Array.from(exceptionsMap.entries()),
    }

    console.log("getProceduralImports", response)
    return response
}

export async function getRuntimeScriptletFilters({scriptletName}) {
    console.log("getDynamicScriptlets", scriptletName)

    // get available scriptlets
    let response = await fetch("/rulesets/dynamic-scriptlet-details.json")
    let responseData = await response.json()
    let availableScriptlets = new Map(responseData.map(({fnName, name}) => ([fnName, name])))

    let scriptletArgsKey = availableScriptlets.get(scriptletName)

    let data = await sessionRead("scriptingFilters.scriptlet");
    // Key includes scriptlet name + args i.e. '["set-cookie","cookies","off"]'
    // Since dynamic scriptlets are handled slightly different than ordinary ones
    // we really only neet the name as the key
    let scriptletArgs = new Map(data.map(([k, v]) => ([JSON.parse(k)[0], v])))

    console.log("getDynamicScriptlets", scriptletArgs, JSON.stringify(data), availableScriptlets)

    if (scriptletArgs.has(scriptletArgsKey)) {
        let details = scriptletArgs.get(scriptletArgsKey)

        console.log("getDynamicScriptlets", details)

        return {
            argsList: [details.args.slice(1)],
            hostnamesMap: details.matches.map((e) => ([e, 0])),
            entitiesMap: [],
            exceptionsMap: [],
        }

    } else {
        return {
            argsList: [],
            hostnamesMap: [],
            entitiesMap: [],
            exceptionsMap: [],
        } 
    }
}

async function registerRuntimeScriptletContentScript(scriptlet) {
    console.log("registerDynamicScriptlets", scriptlet)
    let response = await fetch("/rulesets/dynamic-scriptlet-details.json")
    let data = await response.json()
    let availableScriptlets = new Map(data.map(({name, path}) => ([name, path])))

    let js = []

    for (let {args:[name]} of scriptlet.values()) {
        let path = availableScriptlets.get(name)
        if (path) {
            js.push(path)
        }
    }

    // XXX: Test if unregistering works if scriptlet no longer present

    if (js.length) {
        let registered = await browser.scripting.getRegisteredContentScripts({ ids: ["session_dynamic"]})
        if (registered.length) {
            await browser.scripting.unregisterContentScripts({ ids: ["session_dynamic"]})
        }

        try {
            await browser.scripting.registerContentScripts([{
                id: "session_dynamic",
                js: js,
                allFrames: true,
                matches: ["<all_urls>"],
                //excludeMatches,
                runAt: 'document_start',
                persistAcrossSessions: false,
            }])
        } catch (error) {
            // XXX: For some reason a duplicate script ID error is thrown even if no script
            // with a corresponding id does exists. Even though getRegisteredContentScripts
            // comes up empty handed the scripts get's registered as expected.
            // Only occurs on the first try after reloading the extension
            if (error.message === "Duplicate script ID 'session_dynamic'") {
                console.info("registerDynamicScriptlets error", error.message)
            } else {
                throw error
            }
        }
    }

    console.log("registerDynamicScriptlets", scriptlet, js)
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
        console.log("filtersMessageHandler", key, args)

        messageHandler(...args).then(sendResponse);
        /*
        let response = await messageHandler(...args)

        console.log("filtersMessageHandler", key, response)

        await sendResponse(response)
        */
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
    getConfiguration,

    addRuntimeScriptingFilters,
    getRuntimeScriptingGenericCosmeticFilters,
    getRuntimeScriptingSpecificCosmeticFilters,
    getRuntimeScriptingDeclarativeFilters,
    getRuntimeScriptingProceduralFilters,
    getRuntimeScriptletFilters,

    filtersMessageHandler,
}

export default filters;
