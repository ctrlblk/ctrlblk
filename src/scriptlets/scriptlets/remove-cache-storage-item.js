export default {
    name: 'remove-cache-storage-item.js',
    fn: removeCacheStorageItem,
    world: 'ISOLATED',
    dependencies: ['safe-self.fn'],
};

function removeCacheStorageItem(cacheNamePattern = '', requestPattern = '') {
    if ( cacheNamePattern === '' ) { return; }
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('remove-cache-storage-item', cacheNamePattern, requestPattern);
    const cacheNameDetails = safe.initPattern(cacheNamePattern);
    const requestDetails = safe.initPattern(requestPattern);

    if ( typeof self.caches !== 'object' ) { return; }

    self.caches.keys().then(function(cacheNames) {
        for ( const cacheName of cacheNames ) {
            if ( safe.testPattern(cacheNameDetails, cacheName) === false ) { continue; }

            if ( requestPattern === '' ) {
                // Delete the whole cache
                self.caches.delete(cacheName).then(function(deleted) {
                    if ( deleted ) {
                        safe.log_(logPrefix, 'Deleted cache:', cacheName);
                    }
                });
                continue;
            }

            // Delete matching requests within the cache
            self.caches.open(cacheName).then(function(cache) {
                cache.keys().then(function(requests) {
                    for ( const request of requests ) {
                        if ( safe.testPattern(requestDetails, request.url) ) {
                            cache.delete(request).then(function(deleted) {
                                if ( deleted ) {
                                    safe.log_(logPrefix, 'Deleted request:', request.url, 'from', cacheName);
                                }
                            });
                        }
                    }
                });
            });
        }
    }).catch(function(ex) {
        safe.err_(logPrefix, ex.message);
    });
}
