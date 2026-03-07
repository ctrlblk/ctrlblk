export default {
    name: 'trusted-replace-fetch-response.js',
    requiresTrust: true,
    aliases: ['trusted-rpfr.js'],
    fn: trustedReplaceFetchResponse,
    dependencies: ['replace-fetch-response.fn'],
};

function trustedReplaceFetchResponse(...args) {
    replaceFetchResponseFn(true, ...args);
}
