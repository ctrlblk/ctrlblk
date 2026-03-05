import {
    readFileSync,
    cpSync,
} from "fs";

import { execSync } from "child_process";

import fg from "fast-glob";

import semver from "semver";

import { rulesets } from './rulesets/rulesets.js';


const manifestTemplate = "build/manifest.json";

const sourceDir = "src/js";

export function generateManifestContents(mode) {
    const mf = JSON.parse(
        readFileSync(manifestTemplate, { encoding: "utf8" }),
    );

    let rule_resources = Array.from(rulesets).map(details => {
        return {
            "id": details.id,
            "enabled": details.enabled,
            "path": `/rulesets/main/${details.id}.json`
        }
    });
    mf["declarative_net_request"] = { rule_resources };

    if (mode == "development") {
        mf["version_name"] = semver.clean(mf["version"] + "-development");

        if (process.env.GIT_SHA) {
            mf["version_name"] = mf["version_name"] + `+${process.env.GIT_SHA}`;
        }
    } else {
        mf["version_name"] = semver.clean(mf["version"] +  "-release");
    }

    return mf;
}

function copyAssets() {
    // copy over web accessible resources
    cpSync("src/web_accessible_resources", "dist/web_accessible_resources", { recursive: true });

    // copy over scripting runtime (ctrlblk-owned copies)
    cpSync("src/js/scripting", "dist/js/scripting", { recursive: true });
}

function generateRulesets({ filterTest = false } = {}) {
    const args = ['-o', 'dist/'];
    if (filterTest) {
        args.push('--filter-test');
    }
    execSync(`node build/generate-rulesets.js ${args.join(' ')}`);
}

function compileCss() {
    execSync("pnpm run tailwindcss");
}

function copyImages() {
    cpSync(`images/`, "dist/images", { recursive: true });
    cpSync("ctrlblk-filters/ad-reports.json", "dist/assets/ad-reports.json");
}

export function buildCtrlBlk(mode, manifest, { filterTest = false } = {}) {
    async function closeBundle() {
        copyAssets();
        generateRulesets({ filterTest });
        compileCss();
        copyImages();
    }

    async function buildStart() {
        const files = await fg.glob([`${sourceDir}/**/*`, manifestTemplate]);
        for (let file of files) {
            this.addWatchFile(file);
        }
    }

    return {
        name: "buildCtrlBlk",
        buildStart: buildStart,
        closeBundle: closeBundle,
    };
}
