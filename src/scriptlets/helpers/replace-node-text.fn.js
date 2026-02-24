export default {
    name: 'replace-node-text.fn',
    fn: replaceNodeTextFn,
    dependencies: [
        'run-at.fn',
        'safe-self.fn',
    ],
};

function replaceNodeTextFn(
    nodeName = '',
    pattern = '',
    replacement = ''
) {
    const safe = safeSelf();
    const logPrefix = safe.makeLogPrefix('replace-node-text', nodeName, pattern);
    const extraArgs = safe.getExtraArgs(Array.from(arguments), 3);
    const reNodeName = safe.patternToRegex(nodeName, 'i');
    const rePattern = safe.patternToRegex(pattern, 'gms');
    const conditionRe = extraArgs.condition
        ? safe.patternToRegex(extraArgs.condition)
        : null;
    const sedCount = extraArgs.sedCount !== undefined
        ? parseInt(extraArgs.sedCount, 10)
        : Infinity;
    const stay = extraArgs.stay === true || extraArgs.stay === 1;
    const quitAfter = extraArgs.quitAfter !== undefined
        ? parseInt(extraArgs.quitAfter, 10)
        : 0;

    let replaceCount = 0;

    const handleTrustedTypes = function(node, text) {
        if ( node.nodeName === 'SCRIPT' && self.trustedTypes ) {
            try {
                const policy = self.trustedTypes.createPolicy('replace-node-text', {
                    createScript: function(s) { return s; },
                });
                return policy.createScript(text);
            } catch(ex) {
                // If policy creation fails, fall through
            }
        }
        return text;
    };

    const processNode = function(node) {
        if ( safe.RegExp_test.call(reNodeName, node.nodeName) === false ) {
            return false;
        }
        const text = node.textContent;
        if ( conditionRe && safe.RegExp_test.call(conditionRe, text) === false ) {
            return false;
        }
        if ( safe.RegExp_test.call(rePattern, text) === false ) {
            return false;
        }
        rePattern.lastIndex = 0;
        const newText = text.replace(rePattern, replacement);
        if ( newText === text ) { return false; }
        node.textContent = handleTrustedTypes(node, newText);
        replaceCount += 1;
        safe.log_(logPrefix, 'Replaced text in', node.nodeName);
        return true;
    };

    let observer;

    const stopObserving = function() {
        if ( observer ) {
            observer.disconnect();
            observer = undefined;
            safe.log_(logPrefix, 'Observer disconnected');
        }
    };

    const onMutation = function(mutations) {
        if ( replaceCount >= sedCount ) {
            stopObserving();
            return;
        }
        for ( const mutation of mutations ) {
            for ( const node of mutation.addedNodes ) {
                if ( node.nodeType !== 1 && node.nodeType !== 3 ) { continue; }
                if ( node.nodeType === 1 ) {
                    processNode(node);
                    const children = node.querySelectorAll
                        ? node.querySelectorAll('*')
                        : [];
                    for ( const child of children ) {
                        processNode(child);
                        if ( replaceCount >= sedCount ) {
                            stopObserving();
                            return;
                        }
                    }
                } else {
                    if ( node.parentNode ) {
                        processNode(node.parentNode);
                    }
                }
                if ( replaceCount >= sedCount ) {
                    stopObserving();
                    return;
                }
            }
        }
    };

    observer = new MutationObserver(onMutation);
    observer.observe(document, {
        childList: true,
        subtree: true,
    });

    // Walk existing nodes
    const walker = document.createTreeWalker(
        document,
        NodeFilter.SHOW_ELEMENT,
    );
    while ( walker.nextNode() ) {
        processNode(walker.currentNode);
        if ( replaceCount >= sedCount ) {
            stopObserving();
            break;
        }
    }

    if ( !stay && observer ) {
        runAt(function() {
            stopObserving();
        }, 'interactive');
    }

    if ( quitAfter > 0 && observer ) {
        setTimeout(function() {
            stopObserving();
        }, quitAfter);
    }
}
