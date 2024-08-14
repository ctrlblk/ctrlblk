import fs from 'fs/promises';

import { safeReplace } from '../../uBOBits/safe-replace.js';
import * as makeScriptlet from '../../uBOBits/make-scriptlets.js';

import {
    scriptletJsonReplacer,
    writeFile,
    removeRemoteHostedCodeFilters,
} from './utils.js';


export async function generateCssGeneric(details, filters, exceptions) {
    let src = '';
    let totalSelectorCount = 0;
    let selectorList = [];

    if (filters) {

        filters = removeRemoteHostedCodeFilters(
            filters,
            (key, value) => value
        )

        for (let [hash, selectors] of filters) {
            // Remove exceptions
            if (exceptions) {
                selectors = selectors.filter(v => exceptions.has(v) === false);
            }

            // Keep track of total number of selectors
            totalSelectorCount += selectors.length;

            // Format selectors to be injected into css-generic.js scriptlet below
            selectorList.push([hash, selectors.join(", ")]);
        }
    }


    if (totalSelectorCount > 0) {
        // Read scriptlet template and fill in values
        src = await fs.readFile(`uBOBits/scriptlets/css-generic.template.js`, "utf8");
        src = safeReplace(src,
            /\bself\.\$genericSelectorMap\$/,
            `${JSON.stringify(selectorList, scriptletJsonReplacer)}`
        );
    }

    details.css.generic = totalSelectorCount;
    return src
}

export async function generateCssGenericHigh(details, selectors, exceptions) {
    let src = '';
    
    if (selectors) {
        selectors = Array.from(selectors).sort()
        // Remove exceptions from filters
        if (exceptions) {
            selectors = selectors.filter(v => exceptions.has(v) === false);
        }

        if (selectors.length > 0) {
            // Read scriptlet template and fill in values
            src = await fs.readFile(`uBOBits/scriptlets/css-generichigh.template.css`, "utf8");
            src = safeReplace(src, /\$selectorList\$/, selectors.join(',\n'));
        }

        details.css.genericHigh = selectors.length;
    } else {
        details.css.genericHigh = 0;
    }
    return src;
}

export function generateFourPieceScriptletInner(mapin, flatArgsList) {
    let tmpSelectorsByHostnames = new Map();

    // Merge selectors used by the same hostnames (matches and excludes) into a single entry
    for (let [selector, details] of mapin) {
        if (!details.rejected) {
            // Create string of all domains to be used as unique key
            // XXX: for some reason ublock doesn't sort the domains
            // let matches = details.matches?.sort().join(',') || '*';
            // let excludes = details.excludeMatches?.sort().join(',') || ''
            let matches = details.matches?.join(',') || '*';
            let excludes = details.excludeMatches?.join(',') || ''
            let domains = matches + '!' + excludes

            // Add all selectors for current domain string
            let selectors = tmpSelectorsByHostnames.get(domains) || new Set();
            selectors.add(selector);
            tmpSelectorsByHostnames.set(domains, selectors);
        }
    }

    let selectorsByHostnames = [];
    for (let [domains, selectors] of tmpSelectorsByHostnames) {
        // Unpack domain string from above
        let [matches, excludes] = domains.split('!');
        matches = matches.split(',').filter(v => v.length > 0);
        excludes = excludes.split(',').filter(v => v.length > 0);

        // Turn selector set into a simple string so we can look it up more easily below
        selectors = Array.from(selectors).sort().join(',\n')

        selectorsByHostnames.push([matches, excludes, selectors]);
    }

    // Generate a list of all selectors
    // The following maps all refer back to this list of selectors by index
    let argsList = selectorsByHostnames.map(([m, e, selectors]) => selectors);

    // Generate three maps from selectorsByHostnames
    // hostnamesMap contains which selector applies on which hostname
    let hostnamesMap = new Map();

    // entitiesMap is the same as hostnamesMap but for entities, where entities are
    // essentially domain wildcards matching multiple domains sharing the same eTLD+1
    // but different eTLDs e.g foo.* matches foo.com, foo.com.au, foo.org, etc.
    let entitiesMap = new Map();

    // exceptionsMap contains exceptions on which certain selectors should not apply
    // Note: there is no support for entity exceptions
    let exceptionsMap = new Map();

    for (let [matches, excludes, selector] of selectorsByHostnames) {
        // Find corresponding selector
        let index = argsList.indexOf(selector);

        for (let domain of matches.filter(v => !v.endsWith(".*"))) {
            let indices = hostnamesMap.get(domain) || new Array();
            indices.push(index);
            hostnamesMap.set(domain, indices);
        }

        for (let domain of matches.filter(v => v.endsWith(".*"))) {
            let indices = entitiesMap.get(domain.slice(0, -2)) || new Array();
            indices.push(index);
            entitiesMap.set(domain.slice(0, -2), indices);
        }

        for (let exclude of excludes) {
            let indices = exceptionsMap.get(exclude) || new Array();
            indices.push(index);
            exceptionsMap.set(exclude, indices);
        }
    }

    // Unpack selectors we packed above for convienient lookup
    // but only if we weren't explicitly asked to keep it flat
    if (flatArgsList !== true) {
        argsList = argsList.map(selectors => selectors.split(',\n'));
    }

    return {
        argsList,
        hostnamesMap,
        entitiesMap,
        exceptionsMap,
        selectorsByHostnames,
    }
}

async function generateFourPieceScriptlet(scriptlet, mapin, flatArgsList) {
    let {argsList, hostnamesMap, entitiesMap, exceptionsMap, selectorsByHostnames} = generateFourPieceScriptletInner(mapin, flatArgsList)

    let src = '';

    if (selectorsByHostnames.length > 0) {
        src = await fs.readFile(scriptlet, "utf8");

        src = safeReplace(src,
            /\bself\.\$argsList\$/,
            `${JSON.stringify(argsList, scriptletJsonReplacer)}`
        );
    
        src = safeReplace(src,
            /\bself\.\$hostnamesMap\$/,
            `${JSON.stringify(hostnamesMap, scriptletJsonReplacer)}`
        );
    
        src = safeReplace(src,
            /\bself\.\$entitiesMap\$/,
            `${JSON.stringify(entitiesMap, scriptletJsonReplacer)}`
        );
    
        src = safeReplace(src,
            /\bself\.\$exceptionsMap\$/,
            `${JSON.stringify(exceptionsMap, scriptletJsonReplacer)}`
        );
    }

    return [selectorsByHostnames.length, src];
}

export function splitSpecificCosmetic(filters) {
    const declarativeCosmetic = new Map();
    const proceduralCosmetic = new Map();

    if (filters) {
        for (const [selector, details] of filters) {

            if (details.rejected) {
                console.log("splitSpecificCosmetic rejected", selector, details);
                continue;
            }

            if (selector.startsWith('{')) {
                let parsed = JSON.parse(selector)
                parsed.raw = undefined;
                proceduralCosmetic.set(JSON.stringify(parsed), details);
            } else {
                declarativeCosmetic.set(selector, details);
            }
        }
    }

    return [declarativeCosmetic, proceduralCosmetic];
}

export async function generateCssSpecific(details, specificCosmetic) {
    let [declarativeCosmetic, proceduralCosmetic] = splitSpecificCosmetic(specificCosmetic);

    declarativeCosmetic = removeRemoteHostedCodeFilters(
        declarativeCosmetic,
        (key, value) => key
    )

    let [count, src] = await generateFourPieceScriptlet(
        "uBOBits/scriptlets/css-specific.template.js",
        declarativeCosmetic,
        true);

    details.css.specific = count;

    return src;
}

export async function generateCssDeclarative(details, specificCosmetic) {
    let [declarativeCosmetic, proceduralCosmetic] = splitSpecificCosmetic(specificCosmetic);

    // Strip all not cssable entries
    let proceduralDeclarative = new Map();
    for (let [jsonSelector, details] of proceduralCosmetic) {
        let selector = JSON.parse(jsonSelector);
        if (selector.cssable) {
            selector.cssable = undefined;
            proceduralDeclarative.set(JSON.stringify(selector), details);
        }
    }

    proceduralDeclarative = removeRemoteHostedCodeFilters(
        proceduralDeclarative,
        (key, value) => JSON.parse(key).selector
    )

    let [count, src] = await generateFourPieceScriptlet(
        "uBOBits/scriptlets/css-declarative.template.js",
        proceduralDeclarative);

    details.css.declarative = count;

    return src
}

export async function generateCssProcedural(details, specificCosmetic) {
    let [declarativeCosmetic, proceduralCosmetic] = splitSpecificCosmetic(specificCosmetic);

    let proceduralProcedural = new Map();
    for (let [jsonSelector, details] of proceduralCosmetic) {
        let selector = JSON.parse(jsonSelector);
        if (!selector.cssable) {
            proceduralProcedural.set(JSON.stringify(selector), details);
        }
    }

    proceduralProcedural = removeRemoteHostedCodeFilters(
        proceduralProcedural,
        (key, value) => JSON.parse(key).selector
    )

    let [count, src] = await generateFourPieceScriptlet(
        "uBOBits/scriptlets/css-procedural.template.js",
        proceduralProcedural);

    details.css.procedural = count;

    return src
}

export async function generateScriptlet(details, rulesetDir, rulesetId, mapin) {
    if ( mapin === undefined || mapin.size === 0 ) {
        details.scriptlet = 0;
        return 0;
    }

    mapin = removeRemoteHostedCodeFilters(mapin, (key, value) => value.args)

    makeScriptlet.init();

    for ( const details of mapin.values() ) {
        makeScriptlet.compile(details);
    }
    const stats = await makeScriptlet.commit(
        rulesetId,
        `${rulesetDir}/scripting/scriptlet`,
        writeFile
    );

    details.scriptlets = stats.length;

    makeScriptlet.reset();
    return stats;
}