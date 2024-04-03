module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true,
    },
    extends: ["google", "plugin:prettier/recommended"],
    overrides: [
        {
            env: {
                node: true,
            },
            files: [".eslintrc.{js,cjs}"],
            parserOptions: {
                sourceType: "script",
            },
        },
    ],
    parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
    },
    rules: {
        indent: ["error", 4],
    },
    plugins: ["prettier"],
};
