// A small Vite plugin that builds the extension from its manifest.
//
// It covers only what CtrlBlk's manifest uses: a module service worker
// (background.service_worker) and a side panel page (side_panel.default_path).
// It adds both as build inputs, writes a serviceWorker.js loader that imports
// the service worker's entry chunk, and writes manifest.json pointing at it.
// Everything else (rulesets, web accessible resources, images) is copied by
// buildCtrlBlk in build/build.mjs.
//
// It replaces @samrum/vite-plugin-web-extension, which no longer supports
// current Vite versions.

import { resolve } from "node:path";

// Manifest fields that need a build step this plugin doesn't have. Fail
// loudly instead of shipping an extension that is missing the file.
const unsupportedFields = [
    ["content_scripts"],
    ["action", "default_popup"],
    ["options_ui"],
    ["options_page"],
    ["devtools_page"],
    ["chrome_url_overrides"],
    ["background", "scripts"],
    ["background", "page"],
];

function checkManifest(manifest) {
    for (const path of unsupportedFields) {
        let value = manifest;
        for (const key of path) value = value?.[key];
        if (value !== undefined) {
            throw new Error(
                `webExtension: the manifest field ${path.join(".")} is not supported; ` +
                    "extend build/web-extension.mjs to build it",
            );
        }
    }
}

const stripSlash = (p) => p.replace(/^\//, "");

export function webExtension({ manifest }) {
    checkManifest(manifest);

    const swInput = stripSlash(manifest.background.service_worker);
    const pageInput = stripSlash(manifest.side_panel.default_path);
    let root;

    return {
        name: "ctrlblkWebExtension",

        config() {
            return {
                build: {
                    target: ["chrome91"],
                    modulePreload: false,
                    rollupOptions: {
                        input: {
                            [swInput.replace(/\.js$/, "")]: swInput,
                            [pageInput.replace(/\.html$/, "")]: pageInput,
                        },
                    },
                },
            };
        },

        configResolved(config) {
            root = config.root;
        },

        generateBundle(_options, bundle) {
            const swId = resolve(root, swInput);
            const chunk = Object.values(bundle).find(
                (c) => c.type === "chunk" && c.isEntry && c.facadeModuleId === swId,
            );
            if (!chunk) {
                this.error(`webExtension: no output chunk for ${swInput}`);
            }

            this.emitFile({
                type: "asset",
                fileName: "serviceWorker.js",
                source: `import "/${chunk.fileName}";`,
            });

            // vite.config.mjs also hands the manifest to buildCtrlBlk, so
            // change a copy.
            const out = structuredClone(manifest);
            out.background.service_worker = "serviceWorker.js";
            out.background.type = "module";
            this.emitFile({
                type: "asset",
                fileName: "manifest.json",
                source: JSON.stringify(out, null, 2),
            });
        },
    };
}
