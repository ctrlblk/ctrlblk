export default {
    name: 'alert-buster.js',
    fn: alertBuster,
};

function alertBuster() {
    const originalAlert = self.alert;
    const originalToString = originalAlert.toString;
    self.alert = function(msg) {
        console.info(msg);
    };
    self.alert.toString = function() {
        return originalToString.call(originalAlert);
    };
}
