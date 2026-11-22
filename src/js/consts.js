import semver from "semver";

import { runtime } from "/src/js/lib/browser-api.js";

const DEVELOPMENT = semver.parse(runtime.getManifest().version_name).prerelease[0] === "development"

const baseUrl = new Map([
    [true, "ctrlblk.dev"],
    [false, "ctrlblk.com"],
]).get(DEVELOPMENT);

// Url for the homepage
export const ctrlblkHomepageUrl = `https://${baseUrl}/`;

// Url for the contact page
export const ctrlblkContactUrl = `https://${baseUrl}/contact`;

// Whether or not extension has been loaded using developer mode/unpacked
export const UNPACKED = chrome.runtime.getManifest().update_url === undefined ? true : false;

export default {
    ctrlblkHomepageUrl,
    ctrlblkContactUrl,
    UNPACKED,
}