// Resolves the scriptlet token of a `##+js(...)` filter to the name of a
// builtin scriptlet, the way the build does.

// Map each alias of `scriptlets` to the scriptlet's name.
export function scriptletAliases(scriptlets) {
    const aliases = new Map();
    for (const { name, aliases: list } of scriptlets) {
        if (!Array.isArray(list)) continue;
        for (const alias of list) {
            aliases.set(alias, name);
        }
    }
    return aliases;
}

// The scriptlet name a filter's token refers to: the token with `.js`
// appended if it lacks it, then followed through `aliases`. The name may not
// belong to any scriptlet.
export function resolveScriptletName(token, aliases) {
    const name = token.endsWith('.js') ? token : `${token}.js`;
    return aliases.get(name) ?? name;
}
