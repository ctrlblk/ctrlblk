export default {
    name: 'nowebrtc.js',
    fn: noWebrtc,
};

function noWebrtc() {
    const RTCNames = [
        'RTCPeerConnection',
        'webkitRTCPeerConnection',
    ];
    const StubRTC = function(config) {
        console.info('nowebrtc: blocked RTCPeerConnection construction');
    };
    StubRTC.prototype = {
        close: function() {},
        createDataChannel: function() { return {}; },
        createOffer: function() { return Promise.resolve({}); },
        createAnswer: function() { return Promise.resolve({}); },
        setLocalDescription: function() { return Promise.resolve(); },
        setRemoteDescription: function() { return Promise.resolve(); },
        addIceCandidate: function() { return Promise.resolve(); },
        getStats: function() { return Promise.resolve([]); },
        addEventListener: function() {},
        removeEventListener: function() {},
        dispatchEvent: function() { return true; },
        get localDescription() { return null; },
        get remoteDescription() { return null; },
        get signalingState() { return 'closed'; },
        get iceGatheringState() { return 'complete'; },
        get iceConnectionState() { return 'closed'; },
        get connectionState() { return 'closed'; },
    };
    for ( const name of RTCNames ) {
        if ( self[name] === undefined ) { continue; }
        self[name] = StubRTC;
    }
}
