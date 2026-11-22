import js from "@eslint/js";
import globals from "globals";
import prettier from "eslint-config-prettier";
import { builtinScriptlets } from "./src/scriptlets/index.js";

// Scriptlets and their helpers are injected together into one scope by
// build/generate-rulesets.js, so they call each other without imports.
const scriptletScope = Object.fromEntries(
    builtinScriptlets.map((s) => [s.fn.name, "readonly"]),
);
scriptletScope.scriptletGlobals = "readonly"; // declared in scriptlet.template.js

export default [
    {
        ignores: [
            "dist/",
            // Vendored uBlock Origin redirect resources, copied verbatim into dist/
            "src/web_accessible_resources/",
        ],
    },
    js.configs.recommended,
    {
        languageOptions: { ecmaVersion: "latest", sourceType: "module" },
        rules: {
            "no-unused-vars": ["error", { caughtErrors: "none" }],
            "no-empty": ["error", { allowEmptyCatch: true }],
            "no-empty-pattern": ["error", { allowObjectPatternsAsParameters: true }],
        },
    },
    {
        files: ["src/**"],
        languageOptions: { globals: { ...globals.browser, ...globals.webextensions } },
    },
    {
        files: ["src/scriptlets/helpers/**", "src/scriptlets/scriptlets/**"],
        languageOptions: { globals: scriptletScope },
    },
    {
        files: ["build/**", "tests/**", "*.js", "*.mjs", "*.cjs"],
        languageOptions: { globals: { ...globals.node } },
    },
    {
        // Playwright specs run callbacks in the page and the service worker
        files: ["tests/filter/**", "tests/youtube/**"],
        languageOptions: { globals: { ...globals.browser, ...globals.webextensions } },
    },
    {
        files: ["**/*.cjs"],
        languageOptions: { sourceType: "commonjs" },
    },
    prettier,
];
