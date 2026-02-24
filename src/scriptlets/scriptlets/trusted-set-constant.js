export default {
    name: 'trusted-set-constant.js',
    requiresTrust: true,
    aliases: ['trusted-set.js'],
    fn: trustedSetConstant,
    dependencies: ['set-constant.fn'],
};

function trustedSetConstant(...args) {
    setConstantFn(true, ...args);
}
