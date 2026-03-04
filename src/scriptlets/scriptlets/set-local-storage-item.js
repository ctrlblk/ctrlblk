export default {
    name: 'set-local-storage-item.js',
    fn: setLocalStorageItem,
    world: 'ISOLATED',
    dependencies: ['set-local-storage-item.fn'],
};

function setLocalStorageItem(key = '', value = '') {
    setLocalStorageItemFn('local', false, key, value);
}
