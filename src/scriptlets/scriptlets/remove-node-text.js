export default {
    name: 'remove-node-text.js',
    aliases: ['rmnt.js'],
    fn: removeNodeText,
    world: 'ISOLATED',
    dependencies: ['replace-node-text.fn'],
};

function removeNodeText(nodeName, condition, ...extraArgs) {
    replaceNodeTextFn(nodeName, '', '', 'condition', condition || '', ...extraArgs);
}
