import semver from "semver";

import { runtime } from "/uBOLite/js/ext.js";

const DEVELOPMENT = semver.parse(runtime.getManifest().version_name).prerelease[0] === "development"

const baseUrl = new Map([
    [true, "ctrlblk.dev"],
    [false, "ctrlblk.com"],
]).get(DEVELOPMENT);

// Url for getting the signed url for uploading the ad report
export const getUploadUrlUrl = `https://api.${baseUrl}/adreports/sign`;
//export const getUploadUrlUrl = `http://localhost:8787/adreports/sign`;


// Url for getting the ad reports
export const adReportUrl = `https://api.${baseUrl}/adreports`;
//export const adReportUrl = `http://localhost:8787/adreports`;


// Url for getting the update page
export const updateUrl = `https://api.${baseUrl}/updatePageUrl`;
//export const updateUrl = "http://localhost:8787/updatePageUrl";


// Url for the homepage
export const ctrlblkHomepageUrl = `https://${baseUrl}/`;

// Url for the contact page
export const ctrlblkContactUrl = `https://${baseUrl}/contact`;

export default {
    getUploadUrlUrl,
    adReportUrl,
    updateUrl,
    ctrlblkHomepageUrl,
    ctrlblkContactUrl,
}