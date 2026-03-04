/*******************************************************************************
    CtrlBlk - MV3 content blocker
    Runtime derived from uBlock Origin Lite by Raymond Hill (GPLv3).
*/

/* jshint esversion:11 */

'use strict';

/******************************************************************************/
// Important!
// Isolate from global scope
(function ctrlblk_cssSpecific() {
/******************************************************************************/

const specificImports = self.specificImports || [];
self.specificImports = undefined;
delete self.specificImports;

/******************************************************************************/
const hnParts = [];
try { hnParts.push(...document.location.hostname.split('.')); }
catch(ex) { }
const hnpartslen = hnParts.length;
if ( hnpartslen === 0 ) { return; }
const selectors = [];
for ( const { argsList, exceptionsMap, hostnamesMap, entitiesMap } of specificImports ) {
    const todoIndices = new Set();
    const tonotdoIndices = [];
    // Exceptions
    if ( exceptionsMap.size !== 0 ) {
        for ( let i = 0; i < hnpartslen; i++ ) {
            const hn = hnParts.slice(i).join('.');
            const excepted = exceptionsMap.get(hn);
            if ( excepted ) { tonotdoIndices.push(...excepted); }
        }
        exceptionsMap.clear();
    }
    // Hostname-based
    if ( hostnamesMap.size !== 0 ) {
        const collectArgIndices = hn => {
            let argsIndices = hostnamesMap.get(hn);
            if ( argsIndices === undefined ) { return; }
            if ( typeof argsIndices === 'number' ) { argsIndices = [ argsIndices ]; }
            for ( const argsIndex of argsIndices ) {
                if ( tonotdoIndices.includes(argsIndex) ) { continue; }
                todoIndices.add(argsIndex);
            }
        };
        for ( let i = 0; i < hnpartslen; i++ ) {
            const hn = hnParts.slice(i).join('.');
            collectArgIndices(hn);
        }
        collectArgIndices('*');
        hostnamesMap.clear();
    }
    // Entity-based
    if ( entitiesMap.size !== 0 ) {
        const n = hnpartslen - 1;
        for ( let i = 0; i < n; i++ ) {
            for ( let j = n; j > i; j-- ) {
                const en = hnParts.slice(i,j).join('.');
                let argsIndices = entitiesMap.get(en);
                if ( argsIndices === undefined ) { continue; }
                if ( typeof argsIndices === 'number' ) { argsIndices = [ argsIndices ]; }
                for ( const argsIndex of argsIndices ) {
                    if ( tonotdoIndices.includes(argsIndex) ) { continue; }
                    todoIndices.add(argsIndex);
                }
            }
        }
        entitiesMap.clear();
    }
    for ( const i of todoIndices ) {
        selectors.push(argsList[i]);
    }
    argsList.length = 0;
}
specificImports.length = 0;
if ( selectors.length === 0 ) { return; }
/******************************************************************************/

(function ctrlblk_injectCSS(css, count = 10) {
    chrome.runtime.sendMessage({ what: 'insertCSS', css }).catch(( ) => {
        count -= 1;
        if ( count === 0 ) { return; }
        ctrlblk_injectCSS(css, count - 1);
    });
})(`${selectors.join(',')}{display:none!important;}`);

/******************************************************************************/
})();
/******************************************************************************/

void 0;
