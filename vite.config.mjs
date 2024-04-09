import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import webExtension from "@samrum/vite-plugin-web-extension";

import {
    generateManifestContents,
    buildCtrlBlk,
} from "./build/build.mjs";

export default defineConfig(({mode}) => {

    let manifest = generateManifestContents(mode);

    return {
        plugins: [
            svelte(),
            webExtension({
                manifest: manifest,
                optimizeWebAccessibleResources: false,
            }),
            buildCtrlBlk(mode, manifest),
        ],
        build: {
            outDir: "dist/",
            sourcemap: mode == "development" ? true : false,
            minify: mode == "release" ? true : false,
            emptyOutDir: true,
        },
    };
});