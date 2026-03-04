export default {
    name: 'json-prune-fetch-response.js',
    fn: jsonPruneFetchResponse,
    dependencies: ['json-prune-fetch-response.fn'],
};

function jsonPruneFetchResponse(...args) {
    jsonPruneFetchResponseFn(...args);
}
