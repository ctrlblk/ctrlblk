export default {
    name: 'set-session-storage-item.js',
    fn: setSessionStorageItem,
    world: 'ISOLATED',
    dependencies: ['set-local-storage-item.fn'],
};

function setSessionStorageItem(key = '', value = '') {
    setLocalStorageItemFn('session', false, key, value);
}
