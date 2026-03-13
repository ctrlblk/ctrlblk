module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true,
        webextensions: true,
    },
    ignorePatterns: [
        "build/",
        "src/scriptlets/",
        "src/js/scripting/",
        "src/web_accessible_resources/",
        "dist/",
    ],
    extends: ["eslint:recommended", "plugin:prettier/recommended"],
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
    rules: {},
    plugins: ["prettier"],
};
