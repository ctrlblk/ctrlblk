export default {
    name: 'should-debug.fn',
    fn: shouldDebug,
};

function shouldDebug(details) {
    if ( details instanceof Object === false ) { return false; }
    return scriptletGlobals.canDebug === true && details.debug === true;
}
