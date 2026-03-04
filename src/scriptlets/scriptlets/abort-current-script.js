export default {
    name: 'abort-current-script.js',
    aliases: ['acs.js', 'abort-current-inline-script.js', 'acis.js'],
    fn: abortCurrentScript,
    dependencies: ['abort-current-script-core.fn', 'run-at-html-element.fn'],
};

function abortCurrentScript(...args) {
    runAtHtmlElementFn(() => {
        abortCurrentScriptCore(...args);
    });
}
