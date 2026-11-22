import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { webExtension } from "./build/web-extension.mjs";
import tailwindcss from "@tailwindcss/postcss";

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
            webExtension({ manifest }),
            buildCtrlBlk(mode, manifest, { filterTest }),
        ],
        css: {
            // Tailwind runs as a PostCSS plugin, because @tailwindcss/vite skips
            // .pcss files. Setting PostCSS inline also stops Vite from picking up
            // a PostCSS config from a parent folder.
            postcss: {
                plugins: [tailwindcss()],
            },
        },
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