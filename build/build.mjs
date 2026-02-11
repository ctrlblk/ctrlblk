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

const uBOLiteRoot = "uBOLite";

export function generateManifestContents(mode) {
    // read our and uBOLite's manifest file
    const mf = JSON.parse(
        readFileSync(manifestTemplate, { encoding: "utf8" }),
    );
    const uBOManifest = JSON.parse(
        readFileSync(`${uBOLiteRoot}/manifest.json`, { encoding: "utf8" }),
    );

    let rule_resources = Array.from(rulesets).map(details => {
        return {
            "id": details.id,
            "enabled": details.enabled,
            "path": `/rulesets/main/${details.id}.json`
        }
    });
    mf["declarative_net_request"] = { rule_resources };

    // copy over web accesible ressources definition
    mf["web_accessible_resources"] = uBOManifest["web_accessible_resources"];

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

function copyUBOLAssets() {
    // copy over web accesible resources
    cpSync(`${uBOLiteRoot}/web_accessible_resources`, "dist/web_accessible_resources", { recursive: true });

    // copy over scriptlets
    cpSync(`${uBOLiteRoot}/js/scripting`, "dist/js/scripting", { recursive: true });
}

function generateRulesets() {
    execSync("node build/generate-rulesets.js -o dist/");
}

function compileCss() {
    execSync("pnpm run tailwindcss");
}

function copyImages() {
    cpSync(`images/`, "dist/images", { recursive: true });
    cpSync("ctrlblk-filters/ad-reports.json", "dist/assets/ad-reports.json");
}

export function buildCtrlBlk(mode, manifest) {
    async function closeBundle() {
        copyUBOLAssets();
        generateRulesets();
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