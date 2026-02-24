export default {
    name: 'set-constant.js',
    aliases: ['set.js'],
    fn: setConstant,
    dependencies: ['set-constant.fn'],
};

function setConstant(...args) {
    setConstantFn(false, ...args);
}
