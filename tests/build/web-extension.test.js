// Tests for the in-repo web extension Vite plugin.
// Run with: node --test tests/build/web-extension.test.js
//
// Each test runs a real `vite build` on the small extension in fixture/: a
// service worker (sw.js) and a side panel page (page/index.html -> page/main.js),
// which both import shared.js.

import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "vite";

import { webExtension } from "../../build/web-extension.mjs";

const fixture = fileURLToPath(new URL("./fixture/", import.meta.url));

// Paths start with "/", as in build/manifest.json.
function fixtureManifest() {
    return {
        manifest_version: 3,
        name: "fixture",
        version: "1.0.0",
        permissions: ["sidePanel"],
        background: { service_worker: "/sw.js", type: "module" },
        side_panel: { default_path: "/page/index.html" },
        web_accessible_resources: [
            { resources: ["/web_accessible_resources/*"], matches: ["<all_urls>"] },
        ],
    };
}

async function buildFixture(manifest, outDir) {
    const result = await build({
        configFile: false,
        logLevel: "silent",
        root: fixture,
        plugins: [webExtension({ manifest })],
        build: { outDir, emptyOutDir: true, minify: false },
    });
    return Array.isArray(result) ? result[0] : result;
}

async function listFiles(dir, prefix = "") {
    const files = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
        const rel = prefix + entry.name;
        if (entry.isDirectory()) {
            files.push(...(await listFiles(join(dir, entry.name), rel + "/")));
        } else {
            files.push(rel);
        }
    }
    return files;
}

describe("webExtension", () => {
    let outDir;
    let manifest;
    let original;
    let output;

    before(async () => {
        outDir = await mkdtemp(join(tmpdir(), "ctrlblk-web-extension-"));
        manifest = fixtureManifest();
        original = structuredClone(manifest);
        output = await buildFixture(manifest, outDir);
    });

    after(async () => {
        if (outDir) await rm(outDir, { recursive: true, force: true });
    });

    it("writes the manifest with the service worker pointing at the loader", async () => {
        const written = JSON.parse(await readFile(join(outDir, "manifest.json"), "utf8"));
        const expected = structuredClone(original);
        expected.background.service_worker = "serviceWorker.js";
        assert.deepEqual(written, expected);
        assert.deepEqual(manifest, original, "the manifest passed in must not be mutated");
    });

    it("writes a loader that imports the service worker's entry chunk", async () => {
        const loader = await readFile(join(outDir, "serviceWorker.js"), "utf8");
        const match = /^import "\/([^"]+)";$/.exec(loader);
        assert.ok(match, `unexpected loader: ${JSON.stringify(loader)}`);
        const target = match[1];
        assert.match(target, /^assets\/sw-[\w-]+\.js$/);
        assert.ok(existsSync(join(outDir, target)), `${target} is missing from the output`);

        const chunk = output.output.find((c) => c.type === "chunk" && c.fileName === target);
        assert.ok(chunk, `${target} is not a chunk`);
        assert.ok(chunk.isEntry, `${target} is not an entry chunk`);
        assert.equal(chunk.facadeModuleId, join(fixture, "sw.js"));
    });

    it("builds the side panel page at its manifest path", async () => {
        const html = await readFile(join(outDir, "page/index.html"), "utf8");
        const src = /<script[^>]*\bsrc="([^"]+)"/.exec(html)?.[1];
        assert.ok(src, "the page has no script tag");
        const pageFile = src.replace(/^\//, "");
        assert.ok(existsSync(join(outDir, pageFile)), `${src} is missing from the output`);

        const chunks = output.output.filter((c) => c.type === "chunk");
        const swChunk = chunks.find((c) => c.facadeModuleId === join(fixture, "sw.js"));
        const pageChunk = chunks.find((c) => c.fileName === pageFile);
        assert.ok(swChunk, "no service worker chunk");
        assert.ok(pageChunk, "no page chunk");
        assert.equal(swChunk.imports.length, 1, "the service worker imports one chunk");
        assert.deepEqual(pageChunk.imports, swChunk.imports, "both import the same shared chunk");
    });

    it("adds no modulepreload polyfill", async () => {
        const jsFiles = (await listFiles(outDir)).filter((f) => f.endsWith(".js"));
        assert.ok(jsFiles.length > 0);
        for (const file of jsFiles) {
            const code = await readFile(join(outDir, file), "utf8");
            assert.ok(!code.includes("modulepreload"), `${file} mentions modulepreload`);
        }
    });

    it("throws on a manifest with content_scripts", () => {
        const m = fixtureManifest();
        m.content_scripts = [{ matches: ["<all_urls>"], js: ["/content.js"] }];
        assert.throws(() => webExtension({ manifest: m }), /content_scripts/);
    });

    it("throws on a manifest with action.default_popup", () => {
        const m = fixtureManifest();
        m.action = { default_popup: "/popup.html" };
        assert.throws(() => webExtension({ manifest: m }), /action\.default_popup/);
    });
});
