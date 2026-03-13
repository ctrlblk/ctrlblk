/*******************************************************************************
    CtrlBlk - MV3 content blocker
    Hostname manipulation utilities for WebExtension match patterns and filtering.
*/

export function parsedURLromOrigin(origin) {
    try {
        return new URL(origin);
    } catch {
        // Invalid URL
    }
}

export const toBroaderHostname = (hn) => {
    if (hn === "*") {
        return "";
    }
    const pos = hn.indexOf(".");
    return pos !== -1 ? hn.slice(pos + 1) : "*";
};

// Is hna a descendant hostname of hnb?
export const isDescendantHostname = (hna, hnb) => {
    if (hnb === "all-urls") {
        return true;
    }
    if (hna.endsWith(hnb) === false) {
        return false;
    }
    if (hna === hnb) {
        return false;
    }
    return hna.charCodeAt(hna.length - hnb.length - 1) === 0x2e /* '.' */;
};

export const isDescendantHostnameOfIter = (hna, iterb) => {
    const setb = iterb instanceof Set ? iterb : new Set(iterb);
    if (setb.has("all-urls") || setb.has("*")) {
        return true;
    }
    let hn = hna;
    while (hn) {
        const pos = hn.indexOf(".");
        if (pos === -1) {
            break;
        }
        hn = hn.slice(pos + 1);
        if (setb.has(hn)) {
            return true;
        }
    }
    return false;
};

export const intersectHostnameIters = (itera, iterb) => {
    const setb = iterb instanceof Set ? iterb : new Set(iterb);
    if (setb.has("all-urls") || setb.has("*")) {
        return Array.from(itera);
    }
    const out = [];
    for (const hna of itera) {
        if (setb.has(hna) || isDescendantHostnameOfIter(hna, setb)) {
            out.push(hna);
        }
    }
    return out;
};

export const subtractHostnameIters = (itera, iterb) => {
    const setb = iterb instanceof Set ? iterb : new Set(iterb);
    if (setb.has("all-urls") || setb.has("*")) {
        return [];
    }
    const out = [];
    for (const hna of itera) {
        if (setb.has(hna)) {
            continue;
        }
        if (isDescendantHostnameOfIter(hna, setb)) {
            continue;
        }
        out.push(hna);
    }
    return out;
};

export const matchesFromHostnames = (hostnames) => {
    const out = [];
    for (const hn of hostnames) {
        if (hn === "*" || hn === "all-urls") {
            out.length = 0;
            out.push("<all_urls>");
            break;
        }
        out.push(`*://*.${hn}/*`);
    }
    return out;
};

export const hostnamesFromMatches = (origins) => {
    const out = [];
    for (const origin of origins) {
        if (origin === "<all_urls>") {
            out.push("all-urls");
            continue;
        }
        const match = /^\*:\/\/(?:\*\.)?([^/]+)\/\*/.exec(origin);
        if (match === null) {
            continue;
        }
        out.push(match[1]);
    }
    return out;
};

export const broadcastMessage = (message) => {
    const bc = new self.BroadcastChannel("ctrlblk");
    bc.postMessage(message);
};

export const log = (...args) => {
    console.info("[ctrlblk]", ...args);
};
