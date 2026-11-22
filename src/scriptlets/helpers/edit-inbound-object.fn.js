/*******************************************************************************

    CtrlBlk - MV3 content blocker
    Derived from uBlock Origin by Raymond Hill (GPLv3):
    editInboundObjectFn in src/js/resources/json-edit.js,
    Copyright (C) 2019-present Raymond Hill.

*/

export default {
    name: 'edit-inbound-object.fn',
    fn: editInboundObjectFn,
    dependencies: [
        'jsonpath.fn',
        'proxy-apply.fn',
        'safe-self.fn',
    ],
};

// Edit, with the JSONPath query `jsonq`, a copy of the object passed at
// position `argPosRaw` to the method at `propChain`, and pass the copy to the
// method instead. Only a trusted caller may assign values.
function editInboundObjectFn(
    trusted = false,
    propChain = '',
    argPosRaw = '',
    jsonq = '',
) {
    if ( propChain === '' ) { return; }
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix(
        `${trusted ? 'trusted-' : ''}edit-inbound-object`,
        propChain,
        jsonq
    );
    const jsonp = JSONPath.create(jsonq);
    if ( jsonp.valid === false || jsonp.value !== undefined && trusted !== true ) {
        return safe.log_(logPrefix, 'Bad JSONPath query');
    }
    const argPos = parseInt(argPosRaw, 10);
    if ( isNaN(argPos) ) { return; }
    const getArgPos = args => {
        if ( Array.isArray(args) === false ) { return; }
        if ( argPos >= 0 ) {
            if ( args.length <= argPos ) { return; }
            return argPos;
        }
        if ( args.length < -argPos ) { return; }
        return args.length + argPos;
    };
    const editObj = obj => {
        let clone;
        try {
            clone = safe.structuredClone(obj);
        } catch {
        }
        if ( typeof clone !== 'object' || clone === null ) { return; }
        const objAfter = jsonp.apply(clone);
        if ( objAfter === undefined ) { return; }
        safe.log_(logPrefix, 'Edited');
        if ( safe.logLevel > 1 ) {
            safe.log_(logPrefix, `After edit:\n${safe.JSON_stringify(objAfter, null, 2)}`);
        }
        return objAfter;
    };
    proxyApplyFn(propChain, function(context) {
        const i = getArgPos(context.args);
        if ( i !== undefined ) {
            const objBefore = context.args[i];
            if ( typeof objBefore === 'object' ) {
                const objAfter = editObj(objBefore);
                if ( objAfter ) {
                    context.args[i] = objAfter;
                }
            }
        }
        return context.reflect();
    });
}
