import { parseArgs } from "util";

import {
    readFileSync,
    writeFileSync,
} from "fs";

function main(input, output) {
    let inputText = readFileSync(input, { encoding: "utf8" });

    let uuids = []
    for (let line of inputText.split(/\n/g)) {
        if (line.search("ad-reports") !== -1) {
            let [_, data] = line.split(":")
            let matches = data.matchAll(/[a-f0-9]{8}-?[a-f0-9]{4}-?4[a-f0-9]{3}-?[89ab][a-f0-9]{3}-?[a-f0-9]{12}/g);
            for (let match of matches) {
                uuids.push(match[0]);
            }
        }
    }

    let data = {
        uuids
    }

    writeFileSync(output, JSON.stringify(data, null, "    "), { encoding: "utf8" })
}

const { values, positionals } = parseArgs({
    args: process.argv,
    options: {
      "input": {
        type: 'string',
      },
      "output": {
        type: 'string',
      },
    },
    strict: true,
    allowPositionals: true,
  });

main(values.input, values.output);