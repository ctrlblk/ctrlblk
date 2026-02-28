import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import webExtension from "@samrum/vite-plugin-web-extension";

import {
    generateManifestContents,
    buildCtrlBlk,
} from "./build/build.mjs";
import { addTestRuleset } from "./build/rulesets/rulesets.js";

export default defineConfig(({mode}) => {

    const filterTest = process.argv.includes('--filter-test');
    if (filterTest) {
        addTestRuleset();
    }

    let manifest = generateManifestContents(mode);

    return {
        plugins: [
            svelte(),
            webExtension({
                manifest: manifest,
                optimizeWebAccessibleResources: false,
            }),
            buildCtrlBlk(mode, manifest, { filterTest }),
            {
                // Fix upstream uBOLite code that crashes in service workers:
                // `Element` is not defined in ServiceWorkerGlobalScope, and
                // newer Chrome defines `self.browser` so the && no longer
                // short-circuits past the `instanceof Element` check.
                name: 'fix-ubol-service-worker',
                transform(code, id) {
                    if (id.includes('uBOLite/js/ext.js')) {
                        return code.replace(
                            'self.browser instanceof Element === false',
                            "(typeof Element === 'undefined' || self.browser instanceof Element === false)"
                        );
                    }
                },
            },
        ],
        define: {
            __FILTER_TEST__: JSON.stringify(filterTest),
        },
        build: {
            outDir: "dist/",
            sourcemap: mode == "development" ? true : false,
            minify: mode == "release" ? true : false,
            emptyOutDir: true,
        },
    };
});