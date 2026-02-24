export default {
    name: 'get-exception-token.fn',
    fn: getExceptionToken,
    dependencies: [
        'safe-self.fn',
    ],
};

function getExceptionToken() {
    const safe = safeSelf();
    const letterCode = Date.now() % 26;
    const letter = String.fromCharCode(97 + letterCode);
    const token = letter + safe.Math_floor(safe.Math_random() * 982451653 + 982451653).toString(36);
    const previousOnError = self.onerror;
    self.onerror = function(msg, ...rest) {
        if ( typeof msg === 'string' && msg.includes(token) ) {
            return true;
        }
        if ( previousOnError instanceof Function ) {
            return previousOnError.call(self, msg, ...rest);
        }
    };
    return token;
}
