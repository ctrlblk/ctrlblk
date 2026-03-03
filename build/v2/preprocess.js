// Preprocessor for filter list text.
// Handles !#if / !#else / !#endif directives based on environment flags.
// Reimplementation of uBO's preparser.prune() without using any uBO code.

const preparserTokens = new Map([
    ['ext_ublock', 'ublock'],
    ['ext_ubol', 'ubol'],
    ['ext_devbuild', 'devbuild'],
    ['env_chromium', 'chromium'],
    ['env_edge', 'edge'],
    ['env_firefox', 'firefox'],
    ['env_legacy', 'legacy'],
    ['env_mobile', 'mobile'],
    ['env_mv3', 'mv3'],
    ['env_safari', 'safari'],
    ['cap_html_filtering', 'html_filtering'],
    ['cap_user_stylesheet', 'user_stylesheet'],
    ['false', 'false'],
    ['ext_abp', 'false'],
    ['adguard', 'adguard'],
    ['adguard_app_android', 'false'],
    ['adguard_app_ios', 'false'],
    ['adguard_app_mac', 'false'],
    ['adguard_app_windows', 'false'],
    ['adguard_ext_android_cb', 'false'],
    ['adguard_ext_chromium', 'chromium'],
    ['adguard_ext_edge', 'edge'],
    ['adguard_ext_firefox', 'firefox'],
    ['adguard_ext_opera', 'chromium'],
    ['adguard_ext_safari', 'false'],
]);

function evaluateExprToken(token, env) {
    const not = token.charCodeAt(0) === 0x21; // '!'
    if (not) { token = token.slice(1); }
    const state = preparserTokens.get(token);
    if (state === undefined) { return; }
    return state === 'false' && not || env.includes(state) !== not;
}

function evaluateExpr(expr, env) {
    if (expr.startsWith('(') && expr.endsWith(')')) {
        expr = expr.slice(1, -1);
    }
    const matches = Array.from(expr.matchAll(/(?:(?:&&|\|\|)\s+)?\S+/g));
    if (matches.length === 0) { return; }
    if (matches[0][0].startsWith('|') || matches[0][0].startsWith('&')) { return; }
    let result = evaluateExprToken(matches[0][0], env);
    for (let i = 1; i < matches.length; i++) {
        const parts = matches[i][0].split(/ +/);
        if (parts.length !== 2) { return; }
        const state = evaluateExprToken(parts[1], env);
        if (state === undefined) { return; }
        if (parts[0] === '||') {
            result = result || state;
        } else if (parts[0] === '&&') {
            result = result && state;
        } else {
            return;
        }
    }
    return result;
}

// Returns array of [start, end] index pairs for content to keep
function splitter(content, env) {
    const reIf = /^!#(if|else|endif)\b([^\n]*)(?:[\n\r]+|$)/gm;
    const stack = [];
    const parts = [0];
    let discard = false;

    const shouldDiscard = () => stack.some(v => v);

    const begif = (startDiscard, match) => {
        if (discard === false && startDiscard) {
            parts.push(match.index);
            discard = true;
        }
        stack.push(startDiscard);
    };

    const endif = match => {
        stack.pop();
        const stopDiscard = shouldDiscard() === false;
        if (discard && stopDiscard) {
            parts.push(match.index + match[0].length);
            discard = false;
        }
    };

    for (;;) {
        const match = reIf.exec(content);
        if (match === null) { break; }

        switch (match[1]) {
        case 'if': {
            const startDiscard = evaluateExpr(match[2].trim(), env) === false;
            begif(startDiscard, match);
            break;
        }
        case 'else': {
            if (stack.length === 0) { break; }
            const startDiscard = stack[stack.length - 1] === false;
            endif(match);
            begif(startDiscard, match);
            break;
        }
        case 'endif': {
            endif(match);
            break;
        }
        default:
            break;
        }
    }

    parts.push(content.length);
    return parts;
}

export function prune(content, env) {
    const parts = splitter(content, env);
    const out = [];
    for (let i = 0, n = parts.length - 1; i < n; i += 2) {
        const beg = parts[i + 0];
        const end = parts[i + 1];
        out.push(content.slice(beg, end));
    }
    return out.join('\n');
}
