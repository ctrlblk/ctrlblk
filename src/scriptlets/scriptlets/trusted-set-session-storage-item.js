export default {
    name: 'trusted-set-session-storage-item.js',
    requiresTrust: true,
    fn: trustedSetSessionStorageItem,
    world: 'ISOLATED',
    dependencies: ['set-local-storage-item.fn'],
};

function trustedSetSessionStorageItem(key = '', value = '') {
    setLocalStorageItemFn('session', true, key, value);
}
