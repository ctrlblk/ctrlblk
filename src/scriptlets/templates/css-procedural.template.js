/*******************************************************************************

    CtrlBlk - MV3 content blocker
    Template structure derived from uBlock Origin Lite by Raymond Hill (GPLv3).
    Scriptlet implementations independently authored.

*/

/* jshint esversion:11 */

'use strict';

// ruleset: $rulesetId$

/******************************************************************************/

// Important!
// Isolate from global scope
(function ctrlblk_cssProceduralImport() {

/******************************************************************************/

const argsList = self.$argsList$;

const hostnamesMap = new Map(self.$hostnamesMap$);

const entitiesMap = new Map(self.$entitiesMap$);

const exceptionsMap = new Map(self.$exceptionsMap$);

self.proceduralImports = self.proceduralImports || [];
self.proceduralImports.push({ argsList, hostnamesMap, entitiesMap, exceptionsMap });

/******************************************************************************/

})();

/******************************************************************************/
