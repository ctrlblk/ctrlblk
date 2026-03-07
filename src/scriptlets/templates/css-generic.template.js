/*******************************************************************************

    CtrlBlk - MV3 content blocker
    Template structure derived from uBlock Origin Lite by Raymond Hill (GPLv3).
    Scriptlet implementations independently authored.

*/

/* jshint esversion:11 */

'use strict';

/******************************************************************************/

// Important!
// Isolate from global scope
(function ctrlblk_cssGenericImport() {

/******************************************************************************/

// $rulesetId$

const toImport = self.$genericSelectorMap$;

const genericSelectorMap = self.genericSelectorMap || new Map();

if ( genericSelectorMap.size === 0 ) {
    self.genericSelectorMap = new Map(toImport);
    return;
}

for ( const toImportEntry of toImport ) {
    const existing = genericSelectorMap.get(toImportEntry[0]);
    genericSelectorMap.set(
        toImportEntry[0],
        existing === undefined
            ? toImportEntry[1]
            : `${existing},${toImportEntry[1]}`
    );
}

self.genericSelectorMap = genericSelectorMap;

/******************************************************************************/

})();

/******************************************************************************/
