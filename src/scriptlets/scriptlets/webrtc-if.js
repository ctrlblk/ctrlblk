export default {
    name: 'webrtc-if.js',
    fn: webrtcIf,
    dependencies: ['safe-self.fn'],
};

function webrtcIf(good = '') {
    if ( good === '' ) { return; }
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('webrtc-if', good);
    const reGood = safe.patternToRegex(good);
    const RTCName = typeof RTCPeerConnection !== 'undefined'
        ? 'RTCPeerConnection'
        : typeof webkitRTCPeerConnection !== 'undefined'
            ? 'webkitRTCPeerConnection'
            : '';
    if ( RTCName === '' ) { return; }
    const OriginalRTC = self[RTCName];
    const patchConfig = function(config) {
        if ( config instanceof Object === false ) { return config; }
        if ( Array.isArray(config.iceServers) === false ) { return config; }
        const validServers = [];
        for ( const server of config.iceServers ) {
            const urls = Array.isArray(server.urls) ? server.urls : [ server.urls ];
            const filteredUrls = urls.filter(function(url) {
                return safe.RegExp_test.call(reGood, url);
            });
            if ( filteredUrls.length === 0 ) {
                safe.log_(logPrefix, `Filtered out ICE server(s): ${urls.join(', ')}`);
                continue;
            }
            validServers.push(Object.assign({}, server, {
                urls: filteredUrls,
            }));
        }
        return Object.assign({}, config, { iceServers: validServers });
    };
    self[RTCName] = new Proxy(OriginalRTC, {
        construct: function(target, args) {
            if ( args.length !== 0 ) {
                args[0] = patchConfig(args[0]);
            }
            return new target(...args);
        },
    });
    self[RTCName].prototype = OriginalRTC.prototype;
}
