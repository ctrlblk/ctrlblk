import fs from 'fs/promises'
import path from 'path'


import { ArgumentParser } from 'argparse';

import * as makeScriptlet from '../uBOBits/make-scriptlets.js'
import { builtinScriptlets } from '../uBOBits/scriptlets.js';
import { writeFile } from './rulesets/utils.js';


async function main({ output }) {
    const rulesetDir = path.join(output, "/rulesets")
    const rulesetId = "_session"

    let details = []

    makeScriptlet.init();

    for (let scriptlet of builtinScriptlets) {
        let { name, fn } = scriptlet

        if (!name.endsWith(".fn")) {            
            makeScriptlet.compile({ args: [name], matches: ["<all_urls>"], trustedSource: true });            
        }
    }

    // Ugly wrapper to catch filename
    function _writeFile(fname, data) {
        // Get the name of the function for each file i.e. set-cookie.js => setCookie
        let basename = path.basename(fname).split(".").slice(1).join(".")
        let fnName = builtinScriptlets.filter(({ name, fn }) => name === basename).map(({fn}) => (fn.name))[0]    
    
        details.push({
            name: fname.split(".")[1],
            fnName,
            path: path.join(...fname.split(path.sep).slice(1)),
        })
        return writeFile(fname, data)
    }

    await makeScriptlet.commit(
        rulesetId,
        `${rulesetDir}/scripting/scriptlet`,
        _writeFile,
    );

    await fs.writeFile(`${rulesetDir}/dynamic-scriptlet-details.json`, JSON.stringify(details, null, 4))
}

const parser = new ArgumentParser({ description: "Generate scriptlets for dynamic session rules"});

parser.add_argument("-o", "--output", { required: true, type: String, help: "Output directory aka dist/" });

await main(parser.parse_args())