// Ruleset generator - written from scratch without uBO/uBOLite dependencies.

import fs from 'fs/promises';
import path from 'path';
import { ArgumentParser } from 'argparse';

import { rulesets, addTestRuleset } from './rulesets/rulesets.js';
import { processFilterLists } from './v2/engine.js';
import { builtinScriptlets } from '../uBOBits/scriptlets.js';

// ============================================================================
// Utility functions (reimplemented from build/rulesets/utils.js)
// ============================================================================

function toJSONRuleset(ruleset) {
    const replacer = (k, v) => {
        if (k.startsWith('_')) { return; }
        if (Array.isArray(v)) {
            return v.sort();
        }
        if (v instanceof Object) {
            const sorted = {};
            for (const kk of Object.keys(v).sort()) {
                sorted[kk] = v[kk];
            }
            return sorted;
        }
        return v;
    };
    const out = [];
    for (const rule of ruleset) {
        out.push(JSON.stringify(rule, replacer));
    }
    return `[\n${out.join(',\n')}\n]\n`;
}

async function writeFile(fname, data) {
    const dir = path.dirname(fname);
    await fs.mkdir(dir, { recursive: true });
    return await fs.writeFile(fname, data);
}

function scriptletJsonReplacer(k, v) {
    if (k === 'n') {
        if (v === undefined || v.size === 0) { return; }
        return Array.from(v);
    }
    if (v instanceof Set || v instanceof Map) {
        if (v.size === 0) { return; }
        return Array.from(v);
    }
    return v;
}

function safeReplace(text, pattern, replacement, count = 1) {
    const rePattern = typeof pattern === 'string'
        ? new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        : pattern;
    let out = text;
    for (;;) {
        const match = rePattern.exec(out);
        if (match === null) { break; }
        out = out.slice(0, match.index) +
            replacement +
            out.slice(match.index + match[0].length);
        count -= 1;
        if (count === 0) { break; }
    }
    return out;
}

function isRegexSupported({ regex, isCaseSensitive }) {
    if (regex !== (new RegExp(regex).toString())) {
        return { isSupported: false, reason: 'syntaxError' };
    }
    if (regex.match(/\|/g)) {
        const regexArr = regex.split('|');
        const maxGroups = 15;
        const maxGroupLength = 31;
        if (regexArr.length > maxGroups || regexArr.some((i) => i.length > maxGroupLength)) {
            return { isSupported: false, reason: 'Too many or to large groups' };
        }
    }
    if (regex?.match(/\\[1-9]|\(\?<?(!|=)|{\S+}/g)) {
        return { isSupported: false, reason: 'Unsupported regex syntax' };
    }
    return { isSupported: true };
}

const isRemoteUrl = /:\/\/.*\/.*\.(\w?js|\w?ts)/;

function removeRemoteHostedCodeFilters(mapin, valuefunc) {
    for (let [key, value] of mapin) {
        let entries = valuefunc(key, value);
        entries = Array.isArray(entries) ? entries : [entries];
        for (let entry of entries) {
            if (isRemoteUrl.test(entry)) {
                console.log("Found Remote URL", entry, "removing");
                mapin.delete(key);
            }
        }
    }
    return mapin;
}

// ============================================================================
// DNR output generation
// ============================================================================

function generateDNR(ruleset, rulesetId) {
    let total = ruleset.length;

    // Remove rules with errors
    ruleset = ruleset.filter(rule => rule._error === undefined);

    // Remove unsupported regex rules
    ruleset = ruleset.filter((rule) => {
        if (rule.condition?.regexFilter !== undefined) {
            let { isSupported } = isRegexSupported({
                regex: rule.condition.regexFilter,
                isCaseSensitive: rule.condition.isUrlFilterCaseSensitive || false,
            });
            if (!isSupported) {
                console.log(`[NEW][${rulesetId}] Unsupported regex (id=${rule.id}): ${rule.condition.regexFilter}`);
            }
            return isSupported;
        }
        return true;
    });

    // Set default case sensitivity and normalize case
    ruleset = ruleset.map((rule) => {
        if (rule.condition?.urlFilter || rule.condition?.regexFilter) {
            if (rule.condition.isUrlFilterCaseSensitive === undefined) {
                rule.condition.isUrlFilterCaseSensitive = false;
                // Lowercase urlFilter when case-insensitive (matching uBO behavior)
                if (rule.condition.urlFilter) {
                    rule.condition.urlFilter = rule.condition.urlFilter.toLowerCase();
                }
            } else if (rule.condition.isUrlFilterCaseSensitive === true) {
                rule.condition.isUrlFilterCaseSensitive = undefined;
            }
        }
        return rule;
    });

    let plain = ruleset.length;

    return {
        stats: { total, plain },
        src: toJSONRuleset(ruleset),
    };
}

// ============================================================================
// Cosmetic output generation (reimplemented from build/rulesets/scriptlets.js)
// ============================================================================

async function generateCssGeneric(details, filters, exceptions) {
    let src = '';
    let totalSelectorCount = 0;
    let selectorList = [];

    if (filters) {
        filters = removeRemoteHostedCodeFilters(filters, (key, value) => value);

        for (let [hash, selectors] of filters) {
            if (exceptions) {
                selectors = selectors.filter(v => exceptions.has(v) === false);
            }
            totalSelectorCount += selectors.length;
            selectorList.push([hash, selectors.join(", ")]);
        }
    }

    if (totalSelectorCount > 0) {
        src = await fs.readFile(`uBOBits/scriptlets/css-generic.template.js`, "utf8");
        src = safeReplace(src,
            /\bself\.\$genericSelectorMap\$/,
            `${JSON.stringify(selectorList, scriptletJsonReplacer)}`
        );
    }

    details.css.generic = totalSelectorCount;
    return src;
}

async function generateCssGenericHigh(details, selectors, exceptions) {
    let src = '';

    if (selectors) {
        selectors = Array.from(selectors).sort();
        if (exceptions) {
            selectors = selectors.filter(v => exceptions.has(v) === false);
        }
        if (selectors.length > 0) {
            src = await fs.readFile(`uBOBits/scriptlets/css-generichigh.template.css`, "utf8");
            src = safeReplace(src, /\$selectorList\$/, selectors.join(',\n'));
        }
        details.css.genericHigh = selectors.length;
    } else {
        details.css.genericHigh = 0;
    }
    return src;
}

async function generateFourPieceScriptlet(scriptlet, mapin, flatArgsList) {
    let tmpSelectorsByHostnames = new Map();

    for (let [selector, details] of mapin) {
        if (!details.rejected) {
            let matches = details.matches?.join(',') || '*';
            let excludes = details.excludeMatches?.join(',') || '';
            let domains = matches + '!' + excludes;

            let selectors = tmpSelectorsByHostnames.get(domains) || new Set();
            selectors.add(selector);
            tmpSelectorsByHostnames.set(domains, selectors);
        }
    }

    let selectorsByHostnames = [];
    for (let [domains, selectors] of tmpSelectorsByHostnames) {
        let [matches, excludes] = domains.split('!');
        matches = matches.split(',').filter(v => v.length > 0);
        excludes = excludes.split(',').filter(v => v.length > 0);
        selectors = Array.from(selectors).sort().join(',\n');
        selectorsByHostnames.push([matches, excludes, selectors]);
    }

    let argsList = selectorsByHostnames.map(([m, e, selectors]) => selectors);

    let hostnamesMap = new Map();
    let entitiesMap = new Map();
    let exceptionsMap = new Map();

    for (let [matches, excludes, selector] of selectorsByHostnames) {
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

    if (flatArgsList !== true) {
        argsList = argsList.map(selectors => selectors.split(',\n'));
    }

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

function splitSpecificCosmetic(filters) {
    const declarativeCosmetic = new Map();
    const proceduralCosmetic = new Map();

    if (filters) {
        for (const [selector, details] of filters) {
            if (details.rejected) {
                console.log("splitSpecificCosmetic rejected", selector, details);
                continue;
            }
            if (selector.startsWith('{')) {
                let parsed = JSON.parse(selector);
                parsed.raw = undefined;
                proceduralCosmetic.set(JSON.stringify(parsed), details);
            } else {
                declarativeCosmetic.set(selector, details);
            }
        }
    }

    return [declarativeCosmetic, proceduralCosmetic];
}

async function generateCssSpecific(details, specificCosmetic) {
    let [declarativeCosmetic, proceduralCosmetic] = splitSpecificCosmetic(specificCosmetic);

    declarativeCosmetic = removeRemoteHostedCodeFilters(
        declarativeCosmetic,
        (key, value) => key
    );

    let [count, src] = await generateFourPieceScriptlet(
        "uBOBits/scriptlets/css-specific.template.js",
        declarativeCosmetic,
        true);

    details.css.specific = count;
    return src;
}

async function generateCssDeclarative(details, specificCosmetic) {
    let [declarativeCosmetic, proceduralCosmetic] = splitSpecificCosmetic(specificCosmetic);

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
    );

    let [count, src] = await generateFourPieceScriptlet(
        "uBOBits/scriptlets/css-declarative.template.js",
        proceduralDeclarative);

    details.css.declarative = count;
    return src;
}

async function generateCssProcedural(details, specificCosmetic) {
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
    );

    let [count, src] = await generateFourPieceScriptlet(
        "uBOBits/scriptlets/css-procedural.template.js",
        proceduralProcedural);

    details.css.procedural = count;
    return src;
}

// ============================================================================
// Scriptlet compilation (reimplemented from uBOBits/make-scriptlets.js)
// Uses builtinScriptlets from uBOBits/scriptlets.js for function bodies only
// ============================================================================

const resourceDetails = new Map();
const resourceAliases = new Map();
let scriptletFiles = new Map();

function initScriptlets() {
    for (const scriptlet of builtinScriptlets) {
        const { name, aliases, fn } = scriptlet;
        const entry = {
            name: fn.name,
            code: fn.toString(),
            world: scriptlet.world || 'MAIN',
            dependencies: scriptlet.dependencies,
            requiresTrust: scriptlet.requiresTrust === true,
        };
        resourceDetails.set(name, entry);
        if (!Array.isArray(aliases)) continue;
        for (const alias of aliases) {
            resourceAliases.set(alias, name);
        }
    }
}

function resetScriptlets() {
    scriptletFiles.clear();
}

function createScriptletCoreCode(scriptletToken) {
    const details = resourceDetails.get(scriptletToken);
    const components = new Map([[scriptletToken, details.code]]);
    const dependencies = details.dependencies && details.dependencies.slice() || [];
    while (dependencies.length !== 0) {
        const token = dependencies.shift();
        if (components.has(token)) continue;
        const details = resourceDetails.get(token);
        if (details === undefined) continue;
        components.set(token, details.code);
        if (!Array.isArray(details.dependencies)) continue;
        dependencies.push(...details.dependencies);
    }
    return Array.from(components.values()).join('\n\n');
}

function compileScriptlet(details) {
    if (details.args[0].endsWith('.js') === false) {
        details.args[0] += '.js';
    }
    if (resourceAliases.has(details.args[0])) {
        details.args[0] = resourceAliases.get(details.args[0]);
    }
    const scriptletToken = details.args[0];
    const resourceEntry = resourceDetails.get(scriptletToken);
    if (resourceEntry === undefined) return;
    if (resourceEntry.requiresTrust && details.trustedSource !== true) {
        console.log(`Rejecting ${scriptletToken}: source is not trusted`);
        return;
    }
    if (scriptletFiles.has(scriptletToken) === false) {
        scriptletFiles.set(scriptletToken, {
            name: resourceEntry.name,
            code: createScriptletCoreCode(scriptletToken),
            world: resourceEntry.world,
            args: new Map(),
            hostnames: new Map(),
            entities: new Map(),
            exceptions: new Map(),
            matches: new Set(),
        });
    }
    const scriptletDetails = scriptletFiles.get(scriptletToken);
    const argsToken = JSON.stringify(details.args.slice(1));
    if (scriptletDetails.args.has(argsToken) === false) {
        scriptletDetails.args.set(argsToken, scriptletDetails.args.size);
    }
    const iArgs = scriptletDetails.args.get(argsToken);
    if (details.matches) {
        for (const hn of details.matches) {
            if (hn.endsWith('.*')) {
                scriptletDetails.matches.clear();
                scriptletDetails.matches.add('*');
                const entity = hn.slice(0, -2);
                if (scriptletDetails.entities.has(entity) === false) {
                    scriptletDetails.entities.set(entity, new Set());
                }
                scriptletDetails.entities.get(entity).add(iArgs);
            } else {
                if (scriptletDetails.matches.has('*') === false) {
                    scriptletDetails.matches.add(hn);
                }
                if (scriptletDetails.hostnames.has(hn) === false) {
                    scriptletDetails.hostnames.set(hn, new Set());
                }
                scriptletDetails.hostnames.get(hn).add(iArgs);
            }
        }
    } else {
        scriptletDetails.matches.add('*');
    }
    if (details.excludeMatches) {
        for (const hn of details.excludeMatches) {
            if (scriptletDetails.exceptions.has(hn) === false) {
                scriptletDetails.exceptions.set(hn, []);
            }
            scriptletDetails.exceptions.get(hn).push(iArgs);
        }
    }
}

async function commitScriptlets(rulesetId, dirPath) {
    const scriptletTemplate = await fs.readFile(
        './uBOBits/scriptlets/scriptlet.template.js',
        { encoding: 'utf8' }
    );
    const patchHnMap = hnmap => {
        const out = Array.from(hnmap);
        out.forEach(a => {
            const values = Array.from(a[1]);
            a[1] = values.length === 1 ? values[0] : values;
        });
        return out;
    };
    const scriptletStats = [];
    for (const [name, details] of scriptletFiles) {
        let content = safeReplace(scriptletTemplate,
            'function $scriptletName$(){}',
            details.code
        );
        content = safeReplace(content, /\$rulesetId\$/, rulesetId, 0);
        content = safeReplace(content, /\$scriptletName\$/, details.name, 0);
        content = safeReplace(content, '$world$', details.world);
        content = safeReplace(content,
            'self.$argsList$',
            JSON.stringify(Array.from(details.args.keys()).map(a => JSON.parse(a)))
        );
        content = safeReplace(content,
            'self.$hostnamesMap$',
            JSON.stringify(patchHnMap(details.hostnames))
        );
        content = safeReplace(content,
            'self.$entitiesMap$',
            JSON.stringify(patchHnMap(details.entities))
        );
        content = safeReplace(content,
            'self.$exceptionsMap$',
            JSON.stringify(Array.from(details.exceptions))
        );
        writeFile(`${dirPath}/${rulesetId}.${name}`, content);
        scriptletStats.push([name.slice(0, -3), Array.from(details.matches).sort()]);
    }
    return scriptletStats;
}

async function generateScriptlet(details, rulesetDir, rulesetId, mapin) {
    if (mapin === undefined || mapin.size === 0) {
        details.scriptlet = 0;
        return 0;
    }

    mapin = removeRemoteHostedCodeFilters(mapin, (key, value) => value.args);

    initScriptlets();

    for (const details of mapin.values()) {
        compileScriptlet(details);
    }
    const stats = await commitScriptlets(
        rulesetId,
        `${rulesetDir}/scripting/scriptlet`
    );

    details.scriptlets = stats.length;
    resetScriptlets();
    return stats;
}

// ============================================================================
// Main
// ============================================================================

async function main({ output }) {
    const rulesetDir = `${output}/rulesets`;

    const rulesetDetails = [];
    const genericDetails = [];
    const scriptletDetails = [];

    for (let ruleset of rulesets) {
        let textParts = [];
        for (let url of ruleset.urls) {
            let text = await fs.readFile(url, 'utf8');
            if (ruleset.secret) {
                textParts.push(`!#trusted on ${ruleset.secret}`);
            }
            textParts.push(text);
            if (ruleset.secret) {
                textParts.push(`!#trusted off ${ruleset.secret}`);
            }
        }

        let lists = [{
            name: ruleset.name,
            text: textParts.join('\n'),
        }];

        const options = {
            env: [
                'chromium', 'mv3', 'ublock', 'ubol',
                'user_stylesheet', 'native_css_has'
            ],
            secret: ruleset.secret,
        };

        let results = await processFilterLists(lists, options);

        let dnr = generateDNR(results.network.ruleset, ruleset.id);
        writeFile(`${rulesetDir}/main/${ruleset.id}.json`, dnr.src);

        let details = {
            id: ruleset.id,
            name: ruleset.name,
            group: ruleset.group,
            enabled: ruleset.enabled,
            lang: ruleset.lang,
            homeURL: ruleset.homeURL,
            filters: {
                total: results.network.filterCount,
                accepted: results.network.acceptedFilterCount,
                rejected: results.network.rejectedFilterCount,
            },
            rules: {
                total: dnr.stats.total, plain: dnr.stats.plain,
                regex: 0, removeparam: 0, redirect: 0, modifyHeaders: 0, discarded: 0, rejected: 0,
            },
            css: {
                generic: undefined,
                generichigh: undefined,
                specific: undefined,
                declarative: undefined,
                procedural: undefined,
            },
            scriptlets: undefined,
        };

        let scriptlets = [
            [`generic/${ruleset.id}.js`, generateCssGeneric, [results.genericCosmetic, results.genericCosmeticExceptions]],
            [`generichigh/${ruleset.id}.css`, generateCssGenericHigh, [results.genericHighCosmetic, results.genericCosmeticExceptions]],
            [`specific/${ruleset.id}.js`, generateCssSpecific, [results.specificCosmetic]],
            [`declarative/${ruleset.id}.js`, generateCssDeclarative, [results.specificCosmetic]],
            [`procedural/${ruleset.id}.js`, generateCssProcedural, [results.specificCosmetic]],
        ];

        for (let [filename, func, args] of scriptlets) {
            let [filters, exceptions] = args;
            let src = await func(details, filters, exceptions);
            if (src) {
                src = src.replace('$rulesetId$', ruleset.id);
                writeFile(`${rulesetDir}/scripting/${filename}`, src);
            }
        }

        let scriptletStats = await generateScriptlet(details, rulesetDir, ruleset.id, results.scriptlet);
        if (scriptletStats !== 0) {
            scriptletDetails.push([ruleset.id, scriptletStats]);
        }

        genericDetails.push([
            ruleset.id,
            results.network.generichideExclusions.filter(hn => hn.endsWith('.*') === false).sort()
        ]);

        rulesetDetails.push(details);
    }

    writeFile(
        `${rulesetDir}/ruleset-details.json`,
        `${JSON.stringify(rulesetDetails, undefined, 4)}\n`
    );

    writeFile(
        `${rulesetDir}/generic-details.json`,
        JSON.stringify(genericDetails, undefined, 4)
    );

    writeFile(
        `${rulesetDir}/scriptlet-details.json`,
        JSON.stringify(scriptletDetails, undefined, 4)
    );
}

const parser = new ArgumentParser({ description: "Convert easylist style filter list to DNR+ (v2 - no uBO dependencies)" });
parser.add_argument("-o", "--output", { type: String, required: true, help: "Output directory aka dist/" });
parser.add_argument("--filter-test", { action: "store_true", help: "Include filter test ruleset" });

const args = parser.parse_args();

if (args.filter_test) {
    addTestRuleset();
}

await main(args);
