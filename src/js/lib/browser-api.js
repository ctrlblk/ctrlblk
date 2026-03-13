/*******************************************************************************
    CtrlBlk - MV3 content blocker
    Browser API abstraction layer.
*/

export const browser =
    typeof self.browser === "object" &&
    self.browser !== null &&
    (typeof Element === "undefined" ||
        self.browser instanceof Element === false)
        ? self.browser
        : self.chrome;

export const dnr = browser.declarativeNetRequest;
export const i18n = browser.i18n;
export const runtime = browser.runtime;

// The extension's service worker can be evicted at any time, so when we
// send a message, we retry a few times on failure.
export function sendMessage(msg) {
    return new Promise((resolve, reject) => {
        let i = 5;
        const send = () => {
            runtime
                .sendMessage(msg)
                .then((response) => {
                    resolve(response);
                })
                .catch((reason) => {
                    i -= 1;
                    if (i <= 0) {
                        reject(reason);
                    } else {
                        setTimeout(send, 200);
                    }
                });
        };
        send();
    });
}

export async function localRead(key) {
    if (browser.storage instanceof Object === false) {
        return;
    }
    if (browser.storage.local instanceof Object === false) {
        return;
    }
    try {
        const bin = await browser.storage.local.get(key);
        if (bin instanceof Object === false) {
            return;
        }
        return bin[key] ?? undefined;
    } catch {
        // Storage unavailable
    }
}

export async function localWrite(key, value) {
    if (browser.storage instanceof Object === false) {
        return;
    }
    if (browser.storage.local instanceof Object === false) {
        return;
    }
    return browser.storage.local.set({ [key]: value });
}

export async function localRemove(key) {
    if (browser.storage instanceof Object === false) {
        return;
    }
    if (browser.storage.local instanceof Object === false) {
        return;
    }
    return browser.storage.local.remove(key);
}

export async function sessionRead(key) {
    if (browser.storage instanceof Object === false) {
        return;
    }
    if (browser.storage.session instanceof Object === false) {
        return;
    }
    try {
        const bin = await browser.storage.session.get(key);
        if (bin instanceof Object === false) {
            return;
        }
        return bin[key] ?? undefined;
    } catch {
        // Storage unavailable
    }
}

export async function sessionWrite(key, value) {
    if (browser.storage instanceof Object === false) {
        return;
    }
    if (browser.storage.session instanceof Object === false) {
        return;
    }
    return browser.storage.session.set({ [key]: value });
}

export async function adminRead(key) {
    if (browser.storage instanceof Object === false) {
        return;
    }
    if (browser.storage.managed instanceof Object === false) {
        return;
    }
    try {
        const bin = await browser.storage.managed.get(key);
        if (bin instanceof Object === false) {
            return;
        }
        return bin[key] ?? undefined;
    } catch {
        // Storage unavailable
    }
}
