export default {
    name: 'disable-newtab-links.js',
    fn: disableNewtabLinks,
};

function disableNewtabLinks() {
    document.addEventListener('click', function(ev) {
        let node = ev.target;
        while ( node instanceof HTMLElement ) {
            if ( node.localName === 'a' && node.hasAttribute('target') ) {
                ev.stopPropagation();
                ev.preventDefault();
                break;
            }
            node = node.parentElement;
        }
    }, true);
}
