export default {
    name: 'multiup.js',
    fn: multiup,
    world: 'ISOLATED',
};

function multiup() {
    document.addEventListener('click', function(ev) {
        let node = ev.target;
        while ( node instanceof HTMLElement ) {
            if ( node.localName === 'button' && node.hasAttribute('link') ) {
                if ( node.parentElement && node.parentElement.localName === 'form' ) {
                    ev.stopPropagation();
                    ev.preventDefault();
                    const url = node.getAttribute('link');
                    if ( url ) {
                        document.location.href = url;
                    }
                }
                break;
            }
            node = node.parentElement;
        }
    }, true);
}
