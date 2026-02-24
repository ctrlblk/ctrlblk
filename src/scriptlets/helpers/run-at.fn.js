export default {
    name: 'run-at.fn',
    fn: runAt,
    dependencies: [
        'safe-self.fn',
    ],
};

function runAt(fn, when) {
    const stateToNum = {
        'loading': 1,
        'interactive': 2, 'end': 2, '2': 2,
        'complete': 3, 'idle': 3, '3': 3,
    };
    const targetNum = stateToNum[when] || 1;
    const currentNum = stateToNum[document.readyState] || 1;
    if ( currentNum >= targetNum ) {
        fn();
        return;
    }
    const safe = safeSelf();
    const listener = function() {
        const nowNum = stateToNum[document.readyState] || 1;
        if ( nowNum < targetNum ) { return; }
        safe.removeEventListener.call(document, 'readystatechange', listener);
        fn();
    };
    safe.addEventListener.call(document, 'readystatechange', listener);
}
