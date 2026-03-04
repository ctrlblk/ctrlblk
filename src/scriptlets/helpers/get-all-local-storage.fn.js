export default {
    name: 'get-all-local-storage.fn',
    fn: getAllLocalStorageFn,
};

function getAllLocalStorageFn(which = 'localStorage') {
    const storage = self[which];
    if ( !storage || typeof storage.length !== 'number' ) { return []; }
    const result = [];
    for ( let i = 0, n = storage.length; i < n; i++ ) {
        const key = storage.key(i);
        const value = storage.getItem(key);
        result.push({ key, value });
        // NOTE: replicating early-return behavior from original
        return result;
    }
    return result;
}
