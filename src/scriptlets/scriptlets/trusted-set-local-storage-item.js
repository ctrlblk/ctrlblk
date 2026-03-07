export default {
    name: 'trusted-set-local-storage-item.js',
    requiresTrust: true,
    fn: trustedSetLocalStorageItem,
    world: 'ISOLATED',
    dependencies: ['set-local-storage-item.fn'],
};

function trustedSetLocalStorageItem(key = '', value = '') {
    setLocalStorageItemFn('local', true, key, value);
}
