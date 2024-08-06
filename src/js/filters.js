import { sendMessage } from "/uBOLite/js/ext.js";

export async function isExempt(hostname) {
    return await sendMessage({ key: "isExempt", args: [hostname] });
}

export async function getExceptions() {
    return await sendMessage({ key: "getExceptions"});
}

export async function addException(hostname) {
    return await sendMessage({ key: "addException", args: [hostname]});
}

export async function removeException(hostname) {
    return await sendMessage({ key: "removeException", args: [hostname]});
}

export async function updateExceptionsFromString(hostnames) {
    return await sendMessage({ key: "updateExceptionsFromString", args: [hostnames]});
}

export async function getFilterlistDetails() {
    let response = await sendMessage({ key: "getFilterlistDetails"});
    return response;
}

export async function enableFilterlist(id) {
    return await sendMessage({ key: "enableFilterlist", args: [id]});
}

export async function disableFilterlist(id) {
    return await sendMessage({ key: "disableFilterlist", args: [id]});
}

export async function getConfiguration(id) {
    return await sendMessage({ key: "getConfiguration"});
}

export default {
    isExempt,
    getExceptions,
    addException,
    removeException,
    updateExceptionsFromString,
    getFilterlistDetails,
    enableFilterlist,
    disableFilterlist,
    getConfiguration,
}
