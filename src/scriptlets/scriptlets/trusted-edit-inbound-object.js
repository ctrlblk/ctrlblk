/*******************************************************************************

    CtrlBlk - MV3 content blocker
    Derived from uBlock Origin by Raymond Hill (GPLv3):
    trustedEditInboundObject in src/js/resources/json-edit.js,
    Copyright (C) 2019-present Raymond Hill.

*/

export default {
    name: 'trusted-edit-inbound-object.js',
    requiresTrust: true,
    fn: trustedEditInboundObject,
    dependencies: [
        'edit-inbound-object.fn',
    ],
};

// Edit properties of an object passed as argument to a method; properties
// can be assigned new values.
//
// propChain: the method to trap, e.g. `JSON.stringify`.
// argPos: 0-based position of the argument; negative counts from the end.
// jsonq: a uBO-flavored JSONPath query.
function trustedEditInboundObject(propChain = '', argPos = '', jsonq = '') {
    editInboundObjectFn(true, propChain, argPos, jsonq);
}
