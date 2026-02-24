export default {
    name: 'set-attr.js',
    fn: setAttr,
    world: 'ISOLATED',
    dependencies: ['run-at.fn', 'safe-self.fn'],
};

function setAttr(selector = '', attr = '', value = '') {
    if ( selector === '' || attr === '' ) { return; }
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('set-attr', selector, attr, value);
    const extraArgs = safe.getExtraArgs(Array.from(arguments), 3);

    // Validate value
    let resolvedValue = value;
    let copyFromAttr = '';

    if ( value === '' || value === 'false' || value === 'true' ) {
        resolvedValue = value;
    } else if ( /^-?\d+$/.test(value) ) {
        const n = parseInt(value, 10);
        if ( n < -32768 || n >= 32768 ) {
            safe.log_(logPrefix, 'Value out of range:', value);
            return;
        }
        resolvedValue = value;
    } else if ( value.startsWith('[') && value.endsWith(']') ) {
        copyFromAttr = value.slice(1, -1);
    } else {
        safe.log_(logPrefix, 'Value rejected:', value);
        return;
    }

    // Block setting event handler attributes (on*)
    const isEventAttr = /^on[a-z]/i.test(attr);

    const applyAttr = function(elem) {
        if ( isEventAttr && elem.hasAttribute(attr) ) { return; }
        let finalValue = resolvedValue;
        if ( copyFromAttr !== '' ) {
            finalValue = elem.getAttribute(copyFromAttr);
            if ( finalValue === null ) { return; }
        }
        const currentValue = elem.getAttribute(attr);
        if ( currentValue === finalValue ) { return; }
        elem.setAttribute(attr, finalValue);
        safe.log_(logPrefix, 'Set', attr, '=', finalValue);
    };

    const applyAll = function() {
        try {
            const elems = document.querySelectorAll(selector);
            for ( const elem of elems ) {
                applyAttr(elem);
            }
        } catch(ex) {
            // Invalid selector
        }
    };

    runAt(function() {
        applyAll();

        const observer = new MutationObserver(function(mutations) {
            let shouldRun = false;
            for ( const mutation of mutations ) {
                if ( mutation.addedNodes.length > 0 ) {
                    shouldRun = true;
                    break;
                }
                if ( mutation.type === 'attributes' ) {
                    shouldRun = true;
                    break;
                }
            }
            if ( shouldRun ) {
                applyAll();
            }
        });
        observer.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: copyFromAttr !== '' ? [copyFromAttr] : undefined,
        });
    }, 'idle');
}
