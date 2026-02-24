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
(function ctrlblk_cssSpecificImports() {

/******************************************************************************/

const argsList = self.$argsList$;

const hostnamesMap = new Map(self.$hostnamesMap$);

const entitiesMap = new Map(self.$entitiesMap$);

const exceptionsMap = new Map(self.$exceptionsMap$);

self.specificImports = self.specificImports || [];
self.specificImports.push({ argsList, hostnamesMap, entitiesMap, exceptionsMap });

/******************************************************************************/

})();

/******************************************************************************/
