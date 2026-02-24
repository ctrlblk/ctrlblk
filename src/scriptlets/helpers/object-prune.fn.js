export default {
    name: 'object-prune.fn',
    fn: objectPruneFn,
    dependencies: [
        'matches-stack-trace.fn',
        'object-find-owner.fn',
    ],
};

function objectPruneFn(
    obj,
    rawPrunePaths,
    rawNeedlePaths,
    stackNeedleDetails = { matchAll: true },
    extraArgs = {}
) {
    if ( typeof rawPrunePaths !== 'string' ) { return; }
    const prunePaths = rawPrunePaths !== ''
        ? rawPrunePaths.split(/ +/)
        : [];
    const needlePaths = typeof rawNeedlePaths === 'string' && rawNeedlePaths !== ''
        ? rawNeedlePaths.split(/ +/)
        : [];
    if ( stackNeedleDetails.matchAll !== true ) {
        const logLevel = extraArgs.logstack ? 'all' : '';
        if ( matchesStackTrace(stackNeedleDetails, logLevel) === false ) {
            return;
        }
    }
    if ( prunePaths.length === 0 ) {
        return;
    }
    // Check needlePaths: all must exist
    for ( const needlePath of needlePaths ) {
        if ( objectFindOwnerFn(obj, needlePath) === false ) {
            return;
        }
    }
    let pruned = false;
    for ( const prunePath of prunePaths ) {
        if ( objectFindOwnerFn(obj, prunePath, true) ) {
            pruned = true;
        }
    }
    return pruned ? obj : undefined;
}
