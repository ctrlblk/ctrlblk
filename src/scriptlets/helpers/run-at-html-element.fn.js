export default {
    name: 'run-at-html-element.fn',
    fn: runAtHtmlElementFn,
};

function runAtHtmlElementFn(fn) {
    if ( document.documentElement ) {
        fn();
        return;
    }
    const observer = new MutationObserver(function() {
        observer.disconnect();
        fn();
    });
    observer.observe(document, { childList: true });
}
