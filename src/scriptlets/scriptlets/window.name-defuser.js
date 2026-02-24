export default {
    name: 'window.name-defuser.js',
    fn: windowNameDefuser,
};

function windowNameDefuser() {
    if ( window === window.top ) {
        window.name = '';
    }
}
