/*******************************************************************************
    CtrlBlk - MV3 content blocker
    JSON fetch helper.
*/

export function fetchJSON(path) {
    return fetch(`${path}.json`)
        .then((response) => response.json())
        .catch((reason) => {
            console.info(reason);
        });
}
