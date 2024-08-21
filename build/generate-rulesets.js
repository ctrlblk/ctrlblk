import fs from 'fs/promises';

import { ArgumentParser } from 'argparse';

import { dnrRulesetFromRawLists } from '../uBOBits/static-dnr-filtering.js';
import redirectResourcesMap from '../uBOBits/redirect-resources.js';

import { rulesets } from './rulesets/rulesets.js';

import { writeFile } from './rulesets/utils.js';

import {
    generateCssGeneric,
    generateCssGenericHigh,
    generateCssSpecific,
    generateCssDeclarative,
    generateCssProcedural,
    generateScriptlet,
} from './rulesets/scriptlets.js';

import {
    generateDNR,
} from './rulesets/dnr.js';

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
        }]

        // Build list of available web accesible resources
        const extensionPaths = [];
        for ( const [ fname, details ] of redirectResourcesMap ) {
            const path = `/web_accessible_resources/${fname}`;
            extensionPaths.push([ fname, path ]);
            if ( details.alias === undefined ) { continue; }
            if ( typeof details.alias === 'string' ) {
                extensionPaths.push([ details.alias, path ]);
                continue;
            }
            if ( Array.isArray(details.alias) === false ) { continue; }
            for ( const alias of details.alias ) {
                extensionPaths.push([ alias, path ]);
            }
        }

        const options = {
            env: [
                'chromium',
                'mv3',
                'ublock',
                'ubol',
                'user_stylesheet',
                'native_css_has'
            ],
            extensionPaths,
            secret: ruleset.secret,
            good: new Set(),
            bad: new Set(),
            invalid: new Set(),
            filterCount: 0,
            acceptedFilterCount: 0,
            rejectedFilterCount: 0,
        }

        let results = await dnrRulesetFromRawLists(lists, options);

        let dnr = generateDNR(results.network.ruleset);
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
            // Note: It's neccesary to keep the same structure as the original uBO stats
            // as the uBO filter loading code checks against these values to determine
            // whether additional filter types should be loaded at runtime.
            // In our case all DNR rules are folded into the main ruleset. So we want to tell it
            // to not load any additional filter types at runtime.
            rules: {
                total: dnr.stats.total, plain: dnr.stats.plain,
                regex: 0, removeparam: 0, redirect: 0, modifyHeaders: 0, discarded: 0, rejected: 0,
            },
            // The following undefined values will be filled below
            css: {
                generic: undefined,
                generichigh: undefined,
                specific: undefined,
                declarative: undefined,
                procedural: undefined,
            },
            scriptlets: undefined,
        }

        
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

const parser = new ArgumentParser({ description: "Convert easylist style filter list to DNR+ suitable to be used in CtrlBlk"});

parser.add_argument("-o", "--output", { required: true, type: String, help: "Output directory aka dist/" });

await main(parser.parse_args())