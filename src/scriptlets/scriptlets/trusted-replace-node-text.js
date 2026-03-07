export default {
    name: 'trusted-replace-node-text.js',
    requiresTrust: true,
    aliases: ['trusted-rpnt.js', 'replace-node-text.js', 'rpnt.js'],
    fn: replaceNodeText,
    world: 'ISOLATED',
    dependencies: ['replace-node-text.fn'],
};

function replaceNodeText(nodeName, pattern, replacement, ...extraArgs) {
    replaceNodeTextFn(nodeName, pattern, replacement, ...extraArgs);
}
