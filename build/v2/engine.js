// Core engine for converting EasyList/uBO-format filter lists to Chrome DNR rulesets.
// Written from scratch without using any uBO/uBOLite code.

import { prune } from './preprocess.js';
import { domainToASCII } from 'url';

// ============================================================================
// Redirect resources map (data only - maps resource names to extension paths)
// ============================================================================

const redirectResourcesMap = new Map([
    ['1x1.gif', { alias: '1x1-transparent.gif' }],
    ['2x2.png', { alias: '2x2-transparent.png' }],
    ['3x2.png', { alias: '3x2-transparent.png' }],
    ['32x32.png', { alias: '32x32-transparent.png' }],
    ['amazon_ads.js', { alias: 'amazon-adsystem.com/aax2/amzn_ads.js' }],
    ['amazon_apstag.js', {}],
    ['ampproject_v0.js', { alias: 'ampproject.org/v0.js' }],
    ['chartbeat.js', { alias: 'static.chartbeat.com/chartbeat.js' }],
    ['click2load.html', {}],
    ['doubleclick_instream_ad_status.js', { alias: 'doubleclick.net/instream/ad_status.js' }],
    ['empty', {}],
    ['fingerprint2.js', {}],
    ['fingerprint3.js', {}],
    ['google-analytics_analytics.js', {
        alias: ['google-analytics.com/analytics.js', 'googletagmanager_gtm.js', 'googletagmanager.com/gtm.js'],
    }],
    ['google-analytics_cx_api.js', { alias: 'google-analytics.com/cx/api.js' }],
    ['google-analytics_ga.js', { alias: 'google-analytics.com/ga.js' }],
    ['google-analytics_inpage_linkid.js', { alias: 'google-analytics.com/inpage_linkid.js' }],
    ['google-ima.js', { alias: 'google-ima3' }],
    ['googlesyndication_adsbygoogle.js', {
        alias: ['googlesyndication.com/adsbygoogle.js', 'googlesyndication-adsbygoogle'],
    }],
    ['googletagservices_gpt.js', {
        alias: ['googletagservices.com/gpt.js', 'googletagservices-gpt'],
    }],
    ['hd-main.js', {}],
    ['nobab.js', { alias: ['bab-defuser.js', 'prevent-bab.js'] }],
    ['nobab2.js', {}],
    ['noeval.js', {}],
    ['noeval-silent.js', { alias: 'silent-noeval.js' }],
    ['nofab.js', { alias: 'fuckadblock.js-3.2.0' }],
    ['noop-0.1s.mp3', { alias: ['noopmp3-0.1s', 'abp-resource:blank-mp3'] }],
    ['noop-0.5s.mp3', {}],
    ['noop-1s.mp4', { alias: ['noopmp4-1s', 'abp-resource:blank-mp4'] }],
    ['noop.css', {}],
    ['noop.html', { alias: 'noopframe' }],
    ['noop.js', { alias: ['noopjs', 'abp-resource:blank-js'] }],
    ['noop.json', { alias: ['noopjson'] }],
    ['noop.txt', { alias: 'nooptext' }],
    ['noop-vmap1.0.xml', { alias: 'noopvmap-1.0' }],
    ['outbrain-widget.js', { alias: 'widgets.outbrain.com/outbrain.js' }],
    ['popads.js', { alias: ['popads.net.js', 'prevent-popads-net.js'] }],
    ['popads-dummy.js', {}],
    ['prebid-ads.js', {}],
    ['scorecardresearch_beacon.js', { alias: 'scorecardresearch.com/beacon.js' }],
]);

function buildExtensionPaths() {
    const paths = new Map();
    for (const [fname, details] of redirectResourcesMap) {
        const path = `/web_accessible_resources/${fname}`;
        paths.set(fname, path);
        if (details.alias === undefined) continue;
        if (typeof details.alias === 'string') {
            paths.set(details.alias, path);
            continue;
        }
        if (Array.isArray(details.alias)) {
            for (const alias of details.alias) {
                paths.set(alias, path);
            }
        }
    }
    return paths;
}

// ============================================================================
// Hash function for generic cosmetic selectors (djb2 variant)
// Must mirror the content script surveyor's version
// ============================================================================

const hashFromStr = (type, s) => {
    const len = s.length;
    const step = len + 7 >>> 3;
    let hash = (type << 5) + type ^ len;
    for (let i = 0; i < len; i += step) {
        hash = (hash << 5) + hash ^ s.charCodeAt(i);
    }
    return hash & 0xFFFFFF;
};

// ============================================================================
// Cosmetic selector key extraction
// ============================================================================

const rePlainSelector = /^[#.][\w\\-]+/;
const rePlainSelectorEx = /^[^#.\[(]+([#.][\w-]+)|([#.][\w-]+)$/;
const rePlainSelectorEscaped = /^[#.](?:\\[0-9A-Fa-f]+ |\\.|\w|-)+/;
const reEscapeSequence = /\\([0-9A-Fa-f]+ |.)/g;

const keyFromSelector = selector => {
    let key = '';
    let matches = rePlainSelector.exec(selector);
    if (matches) {
        key = matches[0];
    } else {
        matches = rePlainSelectorEx.exec(selector);
        if (matches === null) { return; }
        key = matches[1] || matches[2];
    }
    if (key.indexOf('\\') === -1) { return key; }
    matches = rePlainSelectorEscaped.exec(selector);
    if (matches === null) { return; }
    key = '';
    const escaped = matches[0];
    let beg = 0;
    reEscapeSequence.lastIndex = 0;
    for (;;) {
        matches = reEscapeSequence.exec(escaped);
        if (matches === null) {
            return key + escaped.slice(beg);
        }
        key += escaped.slice(beg, matches.index);
        beg = reEscapeSequence.lastIndex;
        if (matches[1].length === 1) {
            key += matches[1];
        } else {
            key += String.fromCharCode(parseInt(matches[1], 16));
        }
    }
};

// ============================================================================
// Network filter option name → DNR resource type mapping
// ============================================================================

const typeNameMap = new Map([
    ['stylesheet', 'stylesheet'], ['css', 'stylesheet'],
    ['image', 'image'],
    ['object', 'object'], ['object-subrequest', 'object'],
    ['script', 'script'],
    ['xmlhttprequest', 'xmlhttprequest'], ['xhr', 'xmlhttprequest'],
    ['subdocument', 'sub_frame'], ['sub_frame', 'sub_frame'], ['frame', 'sub_frame'],
    ['font', 'font'],
    ['media', 'media'],
    ['websocket', 'websocket'],
    ['ping', 'ping'], ['beacon', 'ping'],
    ['other', 'other'],
    ['document', 'main_frame'], ['doc', 'main_frame'],
]);

const allResourceTypes = [
    'stylesheet', 'image', 'object', 'script', 'xmlhttprequest',
    'sub_frame', 'font', 'media', 'websocket', 'ping', 'other',
];

// ============================================================================
// Extended filter separator detection
// ============================================================================

// Procedural pseudo-classes that need special compilation (not native CSS)
const proceduralPseudoClasses = new Set([
    'has-text',
    'matches-path',
    'matches-css', 'matches-css-before', 'matches-css-after',
    'matches-attr',
    'matches-media',
    'matches-prop',
    'min-text-length',
    'not-text',
    'others',
    'upward',
    'watch-attr',
    'xpath',
    'nth-ancestor',
    'remove',
    'remove-attr',
    'remove-class',
    'style',
]);

// Find extended filter separator in a line. Returns { index, separator, exception }
// or null if not an extended filter.
function findExtendedSeparator(line) {
    // Use a regex similar to uBO's reExtAnchor to detect extended filter separators
    // Matches: ##, #@#, #?#, #@?#, #$#, #@$#, #$?#, #@$?#
    const re = /(#@?(?:\$\?|\$|%|\?)?#)/;
    const m = re.exec(line);
    if (m === null) return null;

    const idx = m.index;
    const sep = m[1];
    const left = line.slice(0, idx);
    const right = line.slice(idx + sep.length);

    // Right side must not be empty
    if (right.length === 0) return null;

    // Left side should not contain protocol indicators (i.e., it's not a URL)
    if (left.includes('://')) return null;

    // Determine type and exception status
    const exception = sep.includes('#@');
    let type;
    if (sep.includes('$')) {
        type = 'css'; // #$# or #@$# or #$?# or #@$?#
    } else if (sep.includes('%')) {
        type = 'adguard'; // #%# or #@%# - AdGuard scriptlet syntax, skip
    } else {
        type = 'cosmetic'; // ## or #@# or #?# or #@?#
    }

    return { index: idx, separator: sep, exception, type, left, right };
}

// ============================================================================
// Parse a cosmetic/extended filter's domain list
// ============================================================================

// Convert a hostname to punycode (ASCII form) if it contains non-ASCII characters.
// Uses Node.js url.domainToASCII() which mirrors the browser URL API behavior.
function toPunycode(hn) {
    // Fast path: ASCII-only
    if (/^[\x00-\x7f]*$/.test(hn)) return hn;
    const ascii = domainToASCII(hn);
    // domainToASCII returns empty string on error
    return ascii || hn;
}

// Like toPunycode but handles wildcards (*) in hostnames by using a placeholder.
// This mirrors uBO's normalizeHostnameValue which replaces * with __asterisk__
// before punycode conversion, then replaces back afterward.
function toPunycodeWithWildcards(hn) {
    if (/^[\x00-\x7f]*$/.test(hn)) return hn;
    const replaced = hn.replace(/\*/g, '__asterisk__');
    const ascii = domainToASCII(replaced);
    if (!ascii) return hn;
    return ascii.replace(/__asterisk__/g, '*');
}

// Normalize a URL filter pattern: punycode hostname part, percent-encode non-ASCII
// in the path part. Mirrors uBO's normalizePattern behavior.
// The reHostnamePatternPart regex matches hostname-valid chars from the start:
// alphanumeric, -, ., _, *, %, and any Unicode char (stops at /, ^, |, etc.)
const reHostnamePatternPart = /^[^\x00-\x24\x26-\x29\x2B\x2C\x2F\x3A-\x40\x5B-\x5E\x60\x7B-\x7F]+/;
const reHasUnicodeChar = /[^\x00-\x7F]/;

function normalizeUrlFilter(urlFilter) {
    // Fast path: no Unicode chars
    if (!reHasUnicodeChar.test(urlFilter)) return urlFilter;

    // Strip anchors for processing
    let prefix = '';
    let pattern = urlFilter.toLowerCase();
    if (pattern.startsWith('||')) {
        prefix = '||';
        pattern = pattern.slice(2);
    } else if (pattern.startsWith('|')) {
        prefix = '|';
        pattern = pattern.slice(1);
    }

    // Punycode the hostname part of the pattern
    const hnMatch = reHostnamePatternPart.exec(pattern);
    if (hnMatch) {
        const hnPart = hnMatch[0];
        // Process each label individually
        const punycoded = hnPart.replace(/[^.]+/g, label => {
            if (!reHasUnicodeChar.test(label)) return label;
            return toPunycodeWithWildcards(label);
        });
        pattern = punycoded + pattern.slice(hnPart.length);
    }

    // Percent-encode remaining Unicode characters in path part
    if (reHasUnicodeChar.test(pattern)) {
        try {
            pattern = pattern.replace(/\P{ASCII}/gu, s =>
                encodeURIComponent(s).toLowerCase()
            );
        } catch (_) {
            // If encoding fails, return original
            return urlFilter;
        }
    }

    return prefix + pattern;
}

function parseDomainList(domainStr) {
    if (!domainStr || domainStr === '') return [{ hn: '*', not: false, bad: false }];

    // Split on commas, but respect regex patterns (commas inside /.../ are not separators)
    const parts = [];
    let pos = 0;
    const len = domainStr.length;
    while (pos < len) {
        // Skip leading whitespace
        while (pos < len && domainStr[pos] === ' ') pos++;
        if (pos >= len) break;
        // Check for negation prefix
        const not = domainStr[pos] === '~';
        if (not) pos++;
        // Check if this is a regex pattern
        if (pos < len && domainStr[pos] === '/') {
            // Scan forward to find closing /
            let end = pos + 1;
            while (end < len && domainStr[end] !== '/') {
                if (domainStr[end] === '\\') end++; // skip escaped chars
                end++;
            }
            if (end < len) end++; // include closing /
            const hn = domainStr.slice(pos, end);
            parts.push({ hn, not });
            pos = end;
            // Skip comma separator
            while (pos < len && domainStr[pos] === ' ') pos++;
            if (pos < len && domainStr[pos] === ',') pos++;
            continue;
        }
        // Regular hostname — find next comma
        const commaPos = domainStr.indexOf(',', pos);
        const end = commaPos === -1 ? len : commaPos;
        const hn = domainStr.slice(pos, end).trim();
        if (hn) parts.push({ hn, not });
        pos = end;
        if (pos < len && domainStr[pos] === ',') pos++;
    }

    const domains = [];
    let hasError = false;
    for (const { hn, not } of parts) {
        let domain = hn;
        if (!domain) continue;
        // Check for regex domain pattern (starts and ends with /)
        if (domain.length > 2 && domain.charCodeAt(0) === 0x2F && domain.charCodeAt(domain.length - 1) === 0x2F) {
            // Regex domain pattern — normalize using RegExp.source (matches uBO's normalizeRegexPattern)
            try {
                const source = domain.slice(1, -1);
                const regex = new RegExp(source);
                domains.push({ hn: `/${regex.source}/`, not, bad: false });
            } catch (e) {
                // Invalid regex — mark as error (matches uBO's AST_FLAG_HAS_ERROR)
                hasError = true;
            }
            continue;
        }
        // Convert IDN to punycode
        domain = toPunycode(domain);
        // Validate: hostname chars only (letters, digits, dots, hyphens, underscores, wildcards)
        // uBO's reBadHostnameChars rejects [\x00-\x24\x26-\x29\x2b\x2c\x2f\x3b-\x40\x5c\x5e\x60\x7b-\x7f]
        // If any hostname has bad chars, the entire filter is rejected (matches uBO's hasError() check)
        const bad = /[^a-zA-Z0-9._*\-]/.test(domain);
        if (bad) {
            hasError = true;
        }
        domains.push({ hn: domain, not, bad });
    }
    // Match uBO behavior: if any domain is invalid, reject the entire filter
    // (uBO's addToDNR checks parser.hasError() before addExtendedToDNR)
    if (hasError) return null;
    return domains;
}

// ============================================================================
// CSS selector normalization (match uBO's AST-based serialization)
// ============================================================================

// Decode CSS escape sequences in a string value (used for attribute values).
// CSS escapes: \XXXX (1-6 hex digits + optional whitespace) and \X (literal).
function decodeCssEscapes(str) {
    return str.replace(/\\([0-9a-fA-F]{1,6})\s?|\\([^\n])/g, (match, hex, literal) => {
        if (hex !== undefined) {
            const cp = parseInt(hex, 16);
            if (cp === 0 || cp > 0x10FFFF || (cp >= 0xD800 && cp <= 0xDFFF)) return '\uFFFD';
            return String.fromCodePoint(cp);
        }
        return literal;
    });
}

// Encode a decoded string value for output in a CSS double-quoted string.
// Escapes: " → \", \ → \\, control chars → \XX (uppercase hex + space).
function encodeCssDoubleQuotedString(str) {
    let result = '';
    for (let i = 0; i < str.length; i++) {
        const cp = str.codePointAt(i);
        if (cp === 0x22) { // "
            result += '\\"';
        } else if (cp === 0x5C) { // backslash
            result += '\\\\';
        } else if (cp <= 0x1F || cp === 0x7F) {
            // Control characters: uppercase hex + space separator
            result += '\\' + cp.toString(16).toUpperCase() + ' ';
        } else {
            result += String.fromCodePoint(cp);
            if (cp > 0xFFFF) i++; // skip surrogate pair
        }
    }
    return result;
}

// Normalize a CSS selector to match uBO's serialization:
// 1. Quote unquoted attribute values: [attr=value] → [attr="value"]
// 2. Normalize combinator whitespace: .a+.b → .a + .b
// 3. Normalize selector list commas: a,b → a, b
// 4. Decode CSS escapes inside attribute values (matching csstree behavior)
function normalizeCssSelector(sel) {
    if (!sel || typeof sel !== 'string') return sel;

    let result = '';
    let i = 0;
    let inString = 0;      // 0=no, 34=double-quote, 39=single-quote
    let bracketDepth = 0;   // depth inside []
    let afterAttrOp = false; // just seen = inside []
    let cssError = false;   // set to true if CSS syntax error detected

    // Track parenthesis context for combinator normalization
    // true = selector context (normalize combinators), false = non-selector context
    const parenCtxStack = [];
    // Pseudo-functions that take selector arguments
    const selectorPseudoFns = new Set(['is', 'not', 'where', 'has', 'matches', 'host-context']);

    while (i < sel.length) {
        const cc = sel.charCodeAt(i);

        // ---- Inside string ----
        if (inString) {
            result += sel[i];
            if (cc === 0x5C && i + 1 < sel.length) { // backslash escape
                result += sel[i + 1];
                i += 2;
                continue;
            }
            if (cc === inString) {
                inString = 0;
            }
            i++;
            continue;
        }

        // ---- String start ----
        if (cc === 34 || cc === 39) { // " or '
            inString = cc;
            result += sel[i];
            i++;
            continue;
        }

        // ---- Bracket tracking ----
        if (cc === 0x5B) { // [
            bracketDepth++;
            afterAttrOp = false;
            result += sel[i];
            i++;
            // Skip whitespace after [ (csstree normalizes away whitespace inside attribute selectors)
            while (i < sel.length && sel.charCodeAt(i) === 0x20) i++;
            continue;
        }
        if (cc === 0x5D) { // ]
            // Trim trailing whitespace before ] (csstree normalizes this away)
            while (result.length > 0 && result.charCodeAt(result.length - 1) === 0x20
                   && (result.length < 2 || result.charCodeAt(result.length - 2) !== 0x5C)) {
                result = result.slice(0, -1);
            }
            bracketDepth = Math.max(0, bracketDepth - 1);
            afterAttrOp = false;
            result += sel[i];
            i++;
            continue;
        }

        // ---- Inside attribute selector ----
        if (bracketDepth > 0) {
            // Check for attribute operator: =, ~=, |=, ^=, $=, *=
            if (!afterAttrOp) {
                let opLen = 0;
                if (cc === 0x3D) { // =
                    opLen = 1;
                } else if ((cc === 0x7E || cc === 0x7C || cc === 0x5E || cc === 0x24 || cc === 0x2A) // ~|^$*
                           && i + 1 < sel.length && sel.charCodeAt(i + 1) === 0x3D) { // followed by =
                    opLen = 2;
                }
                if (opLen > 0) {
                    result += sel.slice(i, i + opLen);
                    i += opLen;
                    afterAttrOp = true;
                    // Skip whitespace between operator and value (CSS allows spaces here)
                    while (i < sel.length && sel.charCodeAt(i) === 0x20) i++;

                    // Helper: collect attribute value content up to a terminator,
                    // handling CSS backslash escapes (\ + next char pairs).
                    function collectAttrValue(termCharCode) {
                        let val = '';
                        while (i < sel.length && sel.charCodeAt(i) !== termCharCode) {
                            if (sel.charCodeAt(i) === 0x5C && i + 1 < sel.length) { // backslash
                                val += sel[i] + sel[i + 1];
                                i += 2;
                                continue;
                            }
                            val += sel[i];
                            i++;
                        }
                        return val;
                    }

                    // Helper: collect flags between closing quote and ]
                    function collectFlags() {
                        let flagStr = '';
                        while (i < sel.length && sel.charCodeAt(i) !== 0x5D) {
                            flagStr += sel[i];
                            i++;
                        }
                        const trimmed = flagStr.trim();
                        if (trimmed === '') return '';
                        // uBO's astSerializePart validates flags with /^(is?|si?)$/
                        if (/^(is?|si?)$/.test(trimmed)) return ` ${trimmed}`;
                        // Invalid flags (e.g., \i) — mark as CSS error
                        cssError = true;
                        return '';
                    }

                    // Double-quoted value: decode CSS escapes, re-encode
                    if (i < sel.length && sel.charCodeAt(i) === 34) { // "
                        i++; // skip opening "
                        let value = collectAttrValue(34); // collect until "
                        if (i < sel.length) i++; // skip closing "
                        const flags = collectFlags();
                        value = decodeCssEscapes(value);
                        value = encodeCssDoubleQuotedString(value);
                        result += `"${value}"${flags}`;
                        continue;
                    }

                    // Single-quoted value: decode CSS escapes, convert to double quotes
                    if (i < sel.length && sel.charCodeAt(i) === 39) { // '
                        i++; // skip opening '
                        let value = collectAttrValue(39); // collect until '
                        if (i < sel.length) i++; // skip closing '
                        const flags = collectFlags();
                        value = decodeCssEscapes(value);
                        value = encodeCssDoubleQuotedString(value);
                        result += `"${value}"${flags}`;
                        continue;
                    }

                    // Unquoted value - collect, decode CSS escapes, quote it
                    {
                        let value = '';
                        while (i < sel.length && sel.charCodeAt(i) !== 0x5D) { // not ]
                            value += sel[i];
                            i++;
                        }

                        // Check for flags at the end (e.g., " i" or " s")
                        let flags = '';
                        const flagMatch = value.match(/\s+([is])\s*$/);
                        if (flagMatch) {
                            flags = ` ${flagMatch[1]}`;
                            value = value.slice(0, value.length - flagMatch[0].length);
                        }

                        value = decodeCssEscapes(value);
                        value = encodeCssDoubleQuotedString(value);
                        result += `"${value}"${flags}`;
                        continue;
                    }
                }
            }
            result += sel[i];
            i++;
            continue;
        }

        // ---- Outside brackets and strings ----

        // Parenthesis tracking
        if (cc === 0x28) { // (
            // Determine if this is a selector-taking pseudo-function
            // Look backwards in result to find the pseudo-function name
            let j = result.length - 1;
            while (j >= 0 && /[a-zA-Z0-9_-]/.test(result[j])) {
                j--;
            }
            const funcName = result.slice(j + 1).toLowerCase();
            const isSelectorCtx = selectorPseudoFns.has(funcName);
            parenCtxStack.push(isSelectorCtx);
            result += sel[i];
            i++;
            // Skip leading whitespace inside selector-taking pseudo-functions
            // (uBO's AST serializer strips leading whitespace inside :has(), :not(), etc.)
            if (isSelectorCtx) {
                while (i < sel.length && sel.charCodeAt(i) === 0x20) i++;
            }
            continue;
        }
        if (cc === 0x29) { // )
            // Trim trailing whitespace before ) (csstree normalizes this away)
            while (result.length > 0 && result.charCodeAt(result.length - 1) === 0x20
                   && (result.length < 2 || result.charCodeAt(result.length - 2) !== 0x5C)) {
                result = result.slice(0, -1);
            }
            parenCtxStack.pop();
            result += sel[i];
            i++;
            continue;
        }

        // Check if we're in a non-selector parenthesis context
        const inNonSelectorParen = parenCtxStack.length > 0 && !parenCtxStack[parenCtxStack.length - 1];

        // Combinator normalization: +, >, ~
        if (!inNonSelectorParen && (cc === 0x2B || cc === 0x3E || cc === 0x7E)) { // + > ~
            // Check if this is a CSS-escaped character (preceded by \), not a combinator
            if (result.length > 0 && result.charCodeAt(result.length - 1) === 0x5C) {
                result += sel[i];
                i++;
                continue;
            }
            // Trim trailing whitespace from result, but preserve escaped spaces (\ )
            // and preserve the space after comma (so ", >" becomes ",  >" matching csstree)
            while (result.length > 0 && result.charCodeAt(result.length - 1) === 0x20
                   && (result.length < 2 || result.charCodeAt(result.length - 2) !== 0x5C)
                   && (result.length < 2 || result.charCodeAt(result.length - 2) !== 0x2C)) {
                result = result.slice(0, -1);
            }
            // Check if we're at the start of a selector (after (, or at beginning)
            // In that case, uBO doesn't add space before the combinator
            let atSelectorStart = result.length === 0;
            if (!atSelectorStart) {
                const lastCc = result.charCodeAt(result.length - 1);
                atSelectorStart = (lastCc === 0x28 /* ( */);
            }
            if (!atSelectorStart) {
                result += ' ';
            }
            result += sel[i] + ' ';
            i++;
            // Skip following whitespace
            while (i < sel.length && sel.charCodeAt(i) === 0x20) i++;
            continue;
        }

        // Comma normalization (selector list separator)
        if (cc === 0x2C) { // ,
            result += ', ';
            i++;
            // Skip following whitespace
            while (i < sel.length && sel.charCodeAt(i) === 0x20) i++;
            continue;
        }

        // Collapse multiple spaces to one
        if (cc === 0x20) { // space
            result += ' ';
            i++;
            while (i < sel.length && sel.charCodeAt(i) === 0x20) i++;
            continue;
        }

        result += sel[i];
        i++;
    }

    // Normalize nth-* canonical form: (n+ → (1n+, (-n+ → (-1n+
    // uBO's AST serializer always uses explicit coefficient: n+B → 1n+B, -n+B → -1n+B
    result = result.replace(/:(nth-(?:child|of-type|last-child|last-of-type))\((-?)n\+/g, ':$1($21n+');

    // Trim leading whitespace (uBO's AST serializer doesn't produce leading spaces)
    result = result.replace(/^\s+/, '');

    // Trim trailing comma and whitespace (invalid trailing comma in selector list)
    // csstree strips these during parsing
    result = result.replace(/,\s*$/, '');

    // If CSS error was detected during normalization, return null
    if (cssError) return null;

    return result;
}

// ============================================================================
// CSS selector validation — match csstree rejection behavior
// ============================================================================

// Check if the raw selector has unmatched quotes (csstree tokenizer fails on these).
// CSS tokenizer treats ' and " as string delimiters; unmatched quotes produce bad-string
// tokens causing parse errors. This catches e.g. :contains(Padişahbet'ten).
function hasUnmatchedQuotes(str) {
    for (let i = 0; i < str.length; i++) {
        if (str[i] === '\\') { i++; continue; }
        if (str[i] === '"' || str[i] === "'") {
            const quote = str[i];
            i++;
            while (i < str.length && str[i] !== quote) {
                if (str[i] === '\\') i++;
                i++;
            }
            if (i >= str.length) return true; // unclosed string
        }
    }
    return false;
}

// Check if a CSS selector contains an ID selector starting with a digit.
// csstree accepts these in the AST but uBO's astSerializePart rejects them
// with reInvalidIdentifier = /^\d/.
function hasInvalidIdSelector(str) {
    for (let i = 0; i < str.length; i++) {
        if (str[i] === '\\') { i++; continue; }
        if (str[i] === '"' || str[i] === "'") {
            const q = str[i]; i++;
            while (i < str.length && str[i] !== q) {
                if (str[i] === '\\') i++;
                i++;
            }
            continue;
        }
        if (str[i] === '#' && i + 1 < str.length) {
            const next = str.charCodeAt(i + 1);
            // Check if next char is a digit (0-9)
            if (next >= 0x30 && next <= 0x39) return true;
        }
    }
    return false;
}

// ============================================================================
// Compile a cosmetic selector to determine if it's procedural or plain CSS
// ============================================================================

function compileSelector(selector, nativeCssHas) {
    // Reject selectors with unmatched quotes (csstree tokenizer fails on these)
    if (hasUnmatchedQuotes(selector)) {
        return null;
    }

    // Pre-normalize ABP pseudo-class names (match uBO's parser behavior)
    selector = selector.replace(/:-abp-contains\(/g, ':has-text(');
    selector = selector.replace(/:-abp-has\(/g, ':has(');

    // Reject any remaining unsupported :-abp-* pseudo-classes (e.g. :-abp-properties)
    // uBO marks these as errors and discards them
    if (/:(-abp-)/.test(selector)) {
        return null;
    }

    // Capture raw selector after ABP normalization but before :contains() normalization
    // and CSS normalization. The OLD engine (uBO) stores this as the "raw" field on
    // compiled procedural selectors. This is needed because splitSpecificCosmetic strips
    // raw and re-keys by the normalized JSON, and when two filters compile to the same
    // normalized selector but different raw text, Map.set() collision causes the earlier
    // entry's domain associations to be lost. We replicate this behavior for output parity.
    const rawSelector = selector;

    // Normalize operator aliases (match uBO's normalizedOperators)
    // :contains() → :has-text() (when it's a procedural pseudo-class)
    selector = selector.replace(/:contains\(/g, ':has-text(');

    // Check for procedural pseudo-classes
    const proceduralResult = extractProceduralSelector(selector, nativeCssHas);
    if (proceduralResult === false) {
        // Procedural extraction was attempted but failed (e.g., unbalanced base selector,
        // invalid CSS in base). Reject the filter — don't fall through to plain CSS.
        return null;
    }
    if (proceduralResult) {
        // Add raw field to procedural/action selectors (JSON objects)
        const parsed = JSON.parse(proceduralResult);
        parsed.raw = rawSelector;
        return JSON.stringify(parsed);
    }

    // Plain CSS selector - normalize CSS
    const normalized = normalizeCssSelector(selector);
    if (normalized === null) return null;

    // Reject ID selectors starting with a digit (csstree accepts them in the AST but
    // uBO's astSerializePart rejects them with reInvalidIdentifier = /^\d/)
    if (hasInvalidIdSelector(normalized)) return null;

    return normalized;
}

// Strip the "raw" field from a compiled JSON selector string.
// Used for generic cosmetic filters where raw should not be included in the output key.
function stripRawField(compiled) {
    if (typeof compiled === 'string' && compiled.charCodeAt(0) === 0x7B) {
        const parsed = JSON.parse(compiled);
        delete parsed.raw;
        return JSON.stringify(parsed);
    }
    return compiled;
}

// Action pseudo-classes produce "action" key instead of "tasks" (match uBO's ActionSelector)
const actionPseudoClasses = new Set(['remove', 'remove-attr', 'remove-class', 'style']);

// Operator name normalization (matches uBO's normalizedOperators)
const normalizedOperatorNames = new Map([
    ['nth-ancestor', 'upward'],
    ['watch-attrs', 'watch-attr'],
]);
function normalizeOperatorName(name) {
    return normalizedOperatorNames.get(name) || name;
}

// Regex for procedural pseudo-classes that are ALWAYS procedural (never native CSS)
const basicProceduralRe = /:(has-text|if|if-not|matches-path|matches-css(?:-(?:before|after))?|matches-attr|matches-media|matches-prop|min-text-length|not-text|others|shadow|upward|watch-attr|xpath|nth-ancestor|remove|remove-attr|remove-class|style)\(/;

// Same plus :has and :not (used when nativeCssHas is false)
const fullProceduralRe = /:(has|not|has-text|if|if-not|matches-path|matches-css(?:-(?:before|after))?|matches-attr|matches-media|matches-prop|min-text-length|not-text|others|shadow|upward|watch-attr|xpath|nth-ancestor|remove|remove-attr|remove-class|style)\(/;

function extractProceduralSelector(selector, nativeCssHas) {
    const proceduralRe = nativeCssHas ? basicProceduralRe : fullProceduralRe;
    const hasBasicProcedural = proceduralRe.test(selector);

    if (!hasBasicProcedural && !nativeCssHas) {
        return null;
    }

    let match;
    if (nativeCssHas) {
        // Get the first basic procedural match position
        proceduralRe.lastIndex = 0;
        const basicMatch = hasBasicProcedural ? proceduralRe.exec(selector) : null;

        // Also check for :has()/:not() with procedural/nested content
        // (needed even when no basicProcedural — e.g., nested :has() only)
        const hasNotMatch = findFirstProceduralHasOrNot(selector);

        // Use whichever comes first in the selector
        if (hasNotMatch && (!basicMatch || hasNotMatch.index <= basicMatch.index)) {
            match = hasNotMatch;
        } else {
            match = basicMatch;
        }
    } else {
        proceduralRe.lastIndex = 0;
        match = proceduralRe.exec(selector);
    }

    if (!match) return null;
    const result = compileProcedural(selector, match, nativeCssHas);
    // Return false (not null) when compilation was attempted but failed,
    // so the caller can distinguish from "no procedural pseudo-classes found"
    return result === null ? false : result;
}

// Find the matching close paren for a pseudo-class function.
// Handles nested parens, escaped chars, and optionally attribute selectors with quoted values.
// str[start] should be the first char AFTER the opening '('.
// Returns the index AFTER the closing ')'.
// When cssContent=true, tracks [...] brackets and skips quoted values inside them.
// This prevents '(' inside attribute values like [style^="font-size:clamp("] from
// being counted as a nested paren. Only use cssContent=true for pseudo-classes
// whose argument is a CSS selector (:has, :not, :if, :if-not).
function findMatchingCloseParen(str, start, cssContent = false) {
    let depth = 1;
    let i = start;
    for (; i < str.length && depth > 0; i++) {
        const ch = str[i];
        if (ch === '\\') { i++; continue; }
        if (cssContent && ch === '[') {
            // Inside CSS attribute selector — skip to closing ], handling quotes
            i++;
            while (i < str.length && str[i] !== ']') {
                if (str[i] === '\\') { i++; }
                else if (str[i] === '"' || str[i] === "'") {
                    const q = str[i]; i++;
                    while (i < str.length && str[i] !== q) {
                        if (str[i] === '\\') i++;
                        i++;
                    }
                }
                i++;
            }
            continue;
        }
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
    }
    return i;
}

// Find the first :has() or :not() in the selector whose content contains
// a basic procedural pseudo-class (when nativeCssHas=true).
// This handles arbitrarily nested :has()/:not() correctly.
function findFirstProceduralHasOrNot(selector) {
    const hasNotRe = /:(has|not)\(/g;
    let m;
    while ((m = hasNotRe.exec(selector)) !== null) {
        // Find matching close paren (:has/:not take CSS content)
        const argsStart = m.index + m[0].length;
        const i = findMatchingCloseParen(selector, argsStart, true);
        const content = selector.slice(argsStart, i - 1);

        // Check if content has procedural pseudo-classes
        if (basicProceduralRe.test(content)) {
            return { index: m.index, 0: m[0], 1: m[1] };
        }
        // Check for nested :has() in content (CSS spec forbids :has() inside :has())
        // The OLD build treats nested :has() as procedural, but NOT nested :not()
        // Only applies when the outer pseudo is :has(), not :not()
        if (m[1] === 'has' && /:has\(/.test(content)) {
            return { index: m.index, 0: m[0], 1: m[1] };
        }
        // Skip past this :has()/:not() to continue searching
        // (Don't go into the content — we already checked it)
    }
    return null;
}

function compileProcedural(selector, match, nativeCssHas) {
    let baseSelector = selector.slice(0, match.index) || '';
    const pseudoClass = normalizeOperatorName(match[1]);
    const argsStart = match.index + match[0].length;

    // Find matching closing paren. Use CSS-aware bracket tracking for :has/:not/:if/:if-not
    // since their args are CSS selectors that may contain [attr="value("] patterns.
    const cssArgs = (pseudoClass === 'has' || pseudoClass === 'not' || pseudoClass === 'if' || pseudoClass === 'if-not');
    const i = findMatchingCloseParen(selector, argsStart, cssArgs);
    const args = selector.slice(argsStart, i - 1);
    const rest = selector.slice(i);

    // If base ends with a combinator (including descendant/space), add implicit * (universal selector)
    // uBO's AST serializer adds * for the implicit type selector
    if (/[+>~ ]\s*$/.test(baseSelector)) {
        baseSelector = baseSelector.trimEnd() + ' *';
    }
    // Handle combinators that aren't space (remove extra space before *)
    baseSelector = baseSelector.replace(/([+>~])\s+\*$/, '$1*');

    // Normalize the base CSS selector
    const normalizedBase = baseSelector ? normalizeCssSelector(baseSelector) : '';
    // If CSS normalization failed (e.g., invalid attribute flags), reject
    if (normalizedBase === null) return null;
    // Check for unbalanced parens in base selector (e.g., from extracting :has() inside :is())
    // uBO's csstree compilation fails when :is() wraps procedural content
    // Must skip parens inside quoted strings and attribute selectors
    if (normalizedBase) {
        let parenBalance = 0;
        for (let j = 0; j < normalizedBase.length; j++) {
            const ch = normalizedBase[j];
            if (ch === '\\') { j++; continue; }
            if (ch === '"' || ch === "'") {
                const q = ch; j++;
                while (j < normalizedBase.length && normalizedBase[j] !== q) {
                    if (normalizedBase[j] === '\\') j++;
                    j++;
                }
                continue;
            }
            if (ch === '(') parenBalance++;
            else if (ch === ')') parenBalance--;
        }
        if (parenBalance !== 0) return null;
    }

    // Action pseudo-classes: remove, remove-attr, remove-class, style
    if (actionPseudoClasses.has(pseudoClass)) {
        const actionArr = compileActionArgs(pseudoClass, args);
        // Check for tasks in the rest (e.g., :remove():upward(...))
        const tasks = [];
        if (rest && rest.trim()) {
            parseRestIntoTasks(rest, tasks, nativeCssHas);
        }
        const result = { selector: normalizedBase };
        result.action = actionArr;
        // :style is cssable when there are no tasks, or only matches-media tasks (match uBO's isCssable)
        if (pseudoClass === 'style') {
            if (tasks.length === 0) {
                result.cssable = true;
            } else if (tasks.length >= 1 && tasks[0][0] === 'matches-media') {
                if (tasks.length === 1) {
                    result.cssable = true;
                } else if (tasks.length === 2 && normalizedBase === '' && tasks[1][0] === 'spath') {
                    result.cssable = true;
                }
            }
        }
        if (tasks.length > 0) result.tasks = tasks;
        return JSON.stringify(result);
    }

    // Compile task arguments
    const compiledArgs = compileProceduralArgs(pseudoClass, args, nativeCssHas);
    if (compiledArgs === null) return null;
    const tasks = [[pseudoClass, compiledArgs]];

    // Check for chained pseudo-classes or CSS in the rest
    let action = null;
    if (rest) {
        const trimmedRest = rest.trim();
        if (trimmedRest) {
            action = parseRestIntoTasks(rest, tasks, nativeCssHas);
        }
    }

    const result = { selector: normalizedBase };
    if (action) result.action = action;
    result.tasks = tasks;

    // Determine if this is "cssable" (can be implemented with declarative CSS)
    // matches uBO's isCssable(): matches-media qualifies, with no action or :style action
    if ((!action || (Array.isArray(action) && action[0] === 'style')) &&
        tasks.length >= 1 && tasks[0][0] === 'matches-media') {
        if (tasks.length === 1) {
            result.cssable = true;
        } else if (tasks.length === 2 && normalizedBase === '' && tasks[1][0] === 'spath') {
            result.cssable = true;
        }
    }

    return JSON.stringify(result);
}

// Compile action pseudo-class arguments
function compileActionArgs(pseudoClass, args) {
    if (pseudoClass === 'style') return ['style', args];
    if (pseudoClass === 'remove') return ['remove', ''];
    // remove-attr, remove-class use compileText
    return [pseudoClass, compileTextArg(args)];
}

// Parse the "rest" of a selector (after a procedural pseudo-class) into tasks
// Returns action array if an action pseudo-class is found, otherwise null
function parseRestIntoTasks(rest, tasks, nativeCssHas) {
    let action = null;
    const proceduralRe = nativeCssHas ? basicProceduralRe : fullProceduralRe;

    let pos = 0;
    while (pos < rest.length) {
        // Try to match a procedural pseudo-class at current position (after whitespace)
        const wsStart = pos;
        while (pos < rest.length && rest[pos] === ' ') pos++;
        if (pos >= rest.length) break;

        if (rest[pos] === ':') {
            const sub = rest.slice(pos);

            let pseudoMatch = null;
            // When nativeCssHas is true, :has()/:not() with pure CSS content stay as CSS (spath).
            // Only extract them as procedural tasks when content has procedural pseudo-classes.
            if (nativeCssHas) {
                const hasNotMatch = /^:(has|not)\(/.exec(sub);
                if (hasNotMatch) {
                    const start = hasNotMatch[0].length;
                    const j = findMatchingCloseParen(sub, start, true);
                    const content = sub.slice(start, j - 1);
                    if (basicProceduralRe.test(content) || (hasNotMatch[1] === 'has' && /:has\(/.test(content))) {
                        pseudoMatch = { name: normalizeOperatorName(hasNotMatch[1]), argsEnd: j, args: content };
                    }
                }
            }

            // Check for basic procedural pseudo-class
            if (!pseudoMatch) {
                proceduralRe.lastIndex = 0;
                const match = proceduralRe.exec(sub);
                if (match && match.index === 0) {
                    const start = match[0].length;
                    const name = normalizeOperatorName(match[1]);
                    const cssArgs = (name === 'has' || name === 'not' || name === 'if' || name === 'if-not');
                    const j = findMatchingCloseParen(sub, start, cssArgs);
                    pseudoMatch = { name, argsEnd: j, args: sub.slice(start, j - 1) };
                }
            }

            if (pseudoMatch) {
                const { name, argsEnd, args } = pseudoMatch;
                pos += argsEnd;

                if (actionPseudoClasses.has(name)) {
                    action = compileActionArgs(name, args);
                    continue;
                }

                const compiledArgs = compileProceduralArgs(name, args, nativeCssHas);
                tasks.push([name, compiledArgs]);
                continue;
            }
        }

        // Not a procedural pseudo-class — collect CSS until next procedural or end
        // Reset pos to include any leading whitespace in the CSS
        pos = wsStart;
        let cssEnd = pos;
        while (cssEnd < rest.length) {
            if (rest[cssEnd] === ':') {
                const remaining = rest.slice(cssEnd);
                proceduralRe.lastIndex = 0;
                const basicMatch = proceduralRe.exec(remaining);
                if (basicMatch && basicMatch.index === 0) break;
                // When nativeCssHas is true, only break for :has()/:not() with procedural content
                if (nativeCssHas) {
                    const hasNotMatch = /^:(has|not)\(/.exec(remaining);
                    if (hasNotMatch) {
                        const start = hasNotMatch[0].length;
                        const j = findMatchingCloseParen(remaining, start, true);
                        const content = remaining.slice(start, j - 1);
                        if (basicProceduralRe.test(content) || (hasNotMatch[1] === 'has' && /:has\(/.test(content))) break;
                    }
                }
            }
            cssEnd++;
        }

        if (cssEnd > pos) {
            let css = rest.slice(pos, cssEnd);
            const hadLeadingSpace = /^\s/.test(css);
            let normalizedCss = normalizeCssSelector(css.trim());
            // Add leading space only if original text had whitespace (descendant combinator)
            if (hadLeadingSpace) {
                normalizedCss = ' ' + normalizedCss;
            }
            if (normalizedCss.trim()) {
                tasks.push(['spath', normalizedCss]);
            }
            pos = cssEnd;
        } else {
            pos++;
        }
    }

    return action;
}

// Compile procedural pseudo-class arguments
function compileProceduralArgs(name, args, nativeCssHas) {
    switch (name) {
    case 'if': {
        // Argument is a CSS selector (possibly with nested procedurals)
        const inner = extractProceduralSelector(args, nativeCssHas);
        if (inner) {
            const parsed = JSON.parse(inner);
            delete parsed.cssable; // cssable is only for top-level, not nested
            return parsed;
        }
        // Plain CSS selector - :if() returns bare string (matches uBO's compileArgumentAst)
        return normalizeCssSelector(args);
    }
    case 'has': {
        // Argument is a CSS selector (possibly with nested procedurals)
        const inner = extractProceduralSelector(args, nativeCssHas);
        if (inner === false) return null; // compilation attempted but failed (e.g., unbalanced parens from :is() extraction)
        if (inner) {
            const parsed = JSON.parse(inner);
            delete parsed.cssable; // cssable is only for top-level, not nested
            return parsed;
        }
        // Plain CSS selector - :has() wraps in object (matches uBO's compileArgumentAst)
        return { selector: normalizeCssSelector(args) };
    }
    case 'if-not':
    case 'not': {
        // Argument is a CSS selector (possibly with nested procedurals)
        const inner = extractProceduralSelector(args, nativeCssHas);
        if (inner === false) return null; // compilation attempted but failed
        if (inner) {
            // extractProceduralSelector returns a JSON string
            const parsed = JSON.parse(inner);
            delete parsed.cssable; // cssable is only for top-level, not nested
            return parsed;
        }
        // Plain CSS selector - returned as-is for :not() (matches uBO's compileArgumentAst)
        const compiled = compileNotArg(args, nativeCssHas);
        return compiled;
    }
    case 'has-text':
        return compileTextArg(args);
    case 'matches-css':
    case 'matches-css-before':
    case 'matches-css-after':
        return compileCssDeclarationArg(name, args);
    case 'matches-attr':
    case 'matches-prop':
        return compileMatchAttrArg(args);
    case 'upward':
        // If numeric, return as number
        if (/^\d+$/.test(args.trim())) return parseInt(args.trim(), 10);
        // Otherwise it's a selector
        return normalizeCssSelector(args);
    case 'nth-ancestor':
        // nth-ancestor is normalized to upward by uBO
        // This is handled by the caller renaming the task
        return parseInt(args.trim(), 10);
    case 'matches-path':
        return compileTextArg(args);
    case 'remove-attr':
    case 'remove-class':
        return compileTextArg(args);
    case 'watch-attr': {
        // compileAttrList: split by commas, return array
        if (args === '') return args;
        const attrs = args.split(/\s*,\s*/).filter(a => a !== '');
        return attrs;
    }
    case 'min-text-length':
        return parseInt(args.trim(), 10) || 0;
    case 'not-text':
        return compileTextArg(args);
    case 'others':
        return ''; // compileNoArgument
    case 'shadow': {
        // :shadow() takes a selector argument, compile recursively like :has()
        const inner = extractProceduralSelector(args, nativeCssHas);
        if (inner) {
            const parsed = JSON.parse(inner);
            delete parsed.cssable;
            return parsed;
        }
        return normalizeCssSelector(args);
    }
    case 'xpath': {
        const r = unquoteString(args);
        if (r.i !== args.length) return undefined;
        return r.s;
    }
    default:
        return args;
    }
}

// Compile :not() argument - uBO's astCompile returns string or object
function compileNotArg(args, nativeCssHas) {
    let normalized = normalizeCssSelector(args);
    return normalized;
}

// Strip outer quotes from a string (matches uBO's unquoteString)
// Returns {s: unquoted string, i: position after closing quote}
function unquoteString(s) {
    const end = s.length;
    if (end === 0) return { s: '', i: end };
    if (!/^['"]/.test(s)) return { s, i: end };
    const quote = s.charCodeAt(0);
    const out = [];
    let i = 1, c = 0;
    for (;;) {
        if (i >= end) break;
        c = s.charCodeAt(i);
        if (c === quote) {
            i += 1;
            break;
        }
        if (c === 0x5C /* '\\' */) {
            i += 1;
            if (i === end) break;
            c = s.charCodeAt(i);
            if (c !== 0x5C && c !== quote) {
                out.push(0x5C);
            }
        }
        out.push(c);
        i += 1;
    }
    return { s: String.fromCharCode(...out), i };
}

// Compile text argument (matches uBO's compileText → unquoteString)
function compileTextArg(arg) {
    const r = unquoteString(arg);
    if (r.i !== arg.length) return arg;
    return r.s;
}

// Compile CSS declaration argument for matches-css
// uBO's compileCSSDeclaration: extracts pseudo, name, and value.
// Non-regex values are escaped and wrapped in ^...$
function compileCssDeclarationArg(name, arg) {
    // matches-css-before/after prepend "before, " / "after, " (same as uBO)
    let argStr = arg.trim();
    if (name === 'matches-css-before') argStr = `before, ${argStr}`;
    else if (name === 'matches-css-after') argStr = `after, ${argStr}`;

    // Extract pseudo element prefix: "before, rest" or "after, rest"
    let pseudo;
    const pseudoMatch = /^[a-z-]+,/.exec(argStr);
    if (pseudoMatch) {
        pseudo = pseudoMatch[0].slice(0, -1);
        argStr = argStr.slice(pseudoMatch[0].length).trim();
    }

    const colonIdx = argStr.indexOf(':');
    if (colonIdx === -1) return undefined;
    const propName = argStr.slice(0, colonIdx).trim();
    const rawValue = argStr.slice(colonIdx + 1).trim();

    // Check if value is a regex literal: /pattern/flags
    const reMatch = /^\/(.+)\/([imu]+)?$/.exec(rawValue);
    let value;
    if (reMatch) {
        value = reMatch[2] ? [reMatch[1], reMatch[2]] : reMatch[1];
    } else {
        // Escape regex special chars and wrap in ^...$
        value = '^' + rawValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$';
    }

    const result = { name: propName };
    if (pseudo) result.pseudo = pseudo;
    result.value = value;
    return result;
}

// Compile matches-attr argument
// Parses "attr-name" or "attr-name"="value" or "/attr-pattern/"="/value-pattern/"
function compileMatchAttrArg(arg) {
    if (arg === '') return arg;
    let attr = '', value = '';
    const r = unquoteString(arg);
    if (r.i === arg.length) {
        // Entire arg was one quoted (or unquoted) string
        const pos = r.s.indexOf('=');
        if (pos === -1) {
            attr = r.s;
        } else {
            attr = r.s.slice(0, pos);
            value = r.s.slice(pos + 1);
        }
    } else {
        // First part is quoted, rest starts with =
        attr = r.s;
        if (arg.charCodeAt(r.i) !== 0x3D) return arg;
        const valuePart = arg.slice(r.i + 1);
        const r2 = unquoteString(valuePart);
        if (r2.i !== valuePart.length) return arg;
        value = r2.s;
    }
    if (attr === '') return arg;
    if (value.length !== 0) {
        const r2 = unquoteString(value);
        if (r2.i === value.length) {
            value = r2.s;
        }
    }
    return { attr, value };
}

// ============================================================================
// Parse inline CSS filter (#$# separator)
// Format: selector { style-declarations }
// ============================================================================

function parseInlineCss(content) {
    const braceIdx = content.lastIndexOf('{');
    if (braceIdx === -1) return null;

    let selector = content.slice(0, braceIdx).trim();
    let style = content.slice(braceIdx + 1);
    if (style.endsWith('}')) style = style.slice(0, -1);
    style = style.trim();

    if (!selector || !style) return null;

    // Normalize the CSS selector
    selector = normalizeCssSelector(selector);

    // Special: `remove: true` → element removal action
    if (/^\s*remove:\s*true[; ]*$/.test(style)) {
        return {
            selector,
            compiled: JSON.stringify({ selector, action: ['remove', ''] }),
            isElementHiding: false,
        };
    }

    // Optimization: `display: none !important` is equivalent to element hiding
    if (/^\s*display\s*:\s*none\s*!important\s*;?\s*$/.test(style)) {
        return { selector, isElementHiding: true };
    }

    // Return as declarative CSS rule with cssable flag
    return {
        selector,
        style,
        compiled: JSON.stringify({ selector, action: ['style', style], cssable: true }),
        isElementHiding: false,
    };
}

// Check if a hostname in domain=/to=/denyallow= is "bad" (invalid wildcard).
// In the OLD engine's parser, hostnames with wildcards are invalid UNLESS they
// are entity patterns (e.g., `example.*`). Regex domains (starting with `/`)
// are not subject to this check. If ANY hostname in a list is bad, the OLD
// engine rejects the entire filter.
// ============================================================================
// Parse network filter options (everything after $)
// ============================================================================

function parseNetworkOptions(optionsStr) {
    const opts = {
        types: [],
        negatedTypes: [],
        firstParty: false,
        thirdParty: false,
        domains: [],       // { domain, negated }
        toDomains: [],     // { domain, negated }
        important: false,
        matchCase: false,
        redirect: null,
        removeparam: null,
        hasRemoveparam: false,
        csp: null,
        permissions: null,
        badfilter: false,
        generichide: false,
        elemhide: false,
        genericblock: false,
        specifichide: false,
        denyallow: [],
        methods: [],
        negatedMethods: [],
        all: false,
        popup: false,
        redirectRule: null,
    };

    if (!optionsStr) return opts;

    // Pre-extract $replace=, $uritransform=, and $urltransform= values before
    // comma-splitting. These values use /regex/replacement/flags format and can
    // contain commas, so naive splitting would fragment the value and produce
    // spurious unknown-option errors. The modifier value always extends to the
    // end of the option string (it's always the last option in uBO filter syntax).
    let extractedModifier = null;
    const modRe = /,?(replace|uritransform|urltransform)=(.*)/s;
    const modMatch = modRe.exec(optionsStr);
    if (modMatch) {
        extractedModifier = { key: modMatch[1], value: modMatch[2] };
        optionsStr = optionsStr.slice(0, modMatch.index);
    }

    for (let option of optionsStr.split(',')) {
        option = option.trim();
        if (!option) continue;

        // Handle negated options
        const negated = option.startsWith('~');
        const optName = negated ? option.slice(1) : option;

        // Check for assignment options (key=value)
        const eqIdx = optName.indexOf('=');
        const key = eqIdx >= 0 ? optName.slice(0, eqIdx) : optName;
        const value = eqIdx >= 0 ? optName.slice(eqIdx + 1) : undefined;

        // Resource types
        if (typeNameMap.has(key)) {
            const dnrType = typeNameMap.get(key);
            if (negated) {
                opts.negatedTypes.push(dnrType);
            } else {
                opts.types.push(dnrType);
            }
            continue;
        }

        // Party matching
        if (key === 'first-party' || key === '1p') {
            if (negated) { opts.thirdParty = true; }
            else { opts.firstParty = true; }
            continue;
        }
        if (key === 'third-party' || key === '3p') {
            if (negated) { opts.firstParty = true; }
            else { opts.thirdParty = true; }
            continue;
        }

        // Domain/from
        if (key === 'domain' || key === 'from') {
            if (value) {
                for (const d of value.split('|')) {
                    if (!d) continue;
                    const neg = d.startsWith('~');
                    const raw = neg ? d.slice(1) : d;

                    // Don't punycode-convert regex domains
                    const domain = raw.startsWith('/') ? raw : toPunycode(raw);
                    opts.domains.push({ domain, negated: neg });
                }
            }
            continue;
        }

        // To
        if (key === 'to') {
            if (value) {
                for (const d of value.split('|')) {
                    if (!d) continue;
                    const neg = d.startsWith('~');
                    const raw = neg ? d.slice(1) : d;

                    const domain = raw.startsWith('/') ? raw : toPunycode(raw);
                    opts.toDomains.push({ domain, negated: neg });
                }
            }
            continue;
        }

        // Denyallow
        if (key === 'denyallow') {
            if (value) {
                for (const d of value.split('|')) {
                    if (!d) continue;
                    opts.denyallow.push(toPunycode(d));
                }
            }
            continue;
        }

        // Method
        if (key === 'method') {
            if (value) {
                for (const m of value.split('|')) {
                    if (!m) continue;
                    const neg = m.startsWith('~');
                    const method = (neg ? m.slice(1) : m).toLowerCase();
                    if (neg) { opts.negatedMethods.push(method); }
                    else { opts.methods.push(method); }
                }
            }
            continue;
        }

        // Other options
        switch (key) {
        case 'important': opts.important = true; break;
        case 'match-case': opts.matchCase = true; break;
        case 'badfilter': opts.badfilter = true; break;
        case 'generichide': case 'ghide': opts.generichide = true; break;
        case 'elemhide': case 'ehide': opts.elemhide = true; break;
        case 'genericblock': opts.genericblock = true; break;
        case 'all': opts.all = true; break;
        case 'popup':
            if (negated) { opts._negatedPopup = true; }
            else { opts.popup = true; }
            break;
        case 'redirect': case 'rewrite':
            opts.redirect = value || ''; break;
        // $redirect-rule is rejected at parser level in uBO (badTypes includes
        // NODE_TYPE_NET_OPTION_NAME_REDIRECTRULE), producing a bare "Incompatible
        // with DNR" error entry. We skip it before compilation.
        case 'redirect-rule': opts._redirectRule = true; break;
        case 'removeparam': case 'queryprune':
            opts.hasRemoveparam = true;
            opts.removeparam = value !== undefined ? value : '';
            break;
        case 'csp': opts.csp = value || ''; break;
        case 'permissions': opts.permissions = value || ''; break;
        // Options that require trusted source in uBO:
        // - $replace: trusted → silently dropped (REPLACE_REALM not in DNR output);
        //             untrusted → parser rejects with bare error
        // - $uritransform/$urltransform: trusted → RULE-level error (Incompatible with DNR);
        //                                 untrusted → parser rejects with bare error
        // - $urlskip: always rejected at parser level (produces bare error)
        case 'replace':
            opts._replace = true;
            opts._replaceValue = value || '';
            break;
        case 'urltransform': case 'uritransform':
            opts._uritransform = true;
            opts._uritransformValue = value || '';
            break;
        case 'urlskip':
            opts._unsupported = true;
            break;
        // $cname: blocking filters are rejected by uBO parser (realBad = true when
        // isException === false), producing bare errors. Exception @@...$cname filters
        // are accepted by the parser but produce no DNR output (silent skip).
        case 'cname':
            opts._cname = true;
            break;
        // $popunder is a behavioral type with no DNR equivalent.
        // In uBO, the filter compiles and produces a type bit entry (bit position 12),
        // but the DNR conversion silently skips it (no rule, no error).
        // We track it for expansion counting since the OLD engine counts it.
        case 'popunder':
            opts._popunder = true;
            break;
        // inline-script/inline-font are non-network types with no DNR equivalent.
        // Negated (~inline-font): In uBO, sets NOT_TYPE_BIT which causes
        // FilterNotType to add excludedResourceTypes:['main_frame'].
        // Non-negated: skip this type, but don't reject the whole filter
        // if other supported types are present (e.g., $inline-script,script).
        // If inline-script/inline-font is the ONLY positive type, the filter
        // is rejected post-parsing (no supported types remain).
        case 'inline-script': case 'inline-font':
            if (negated) {
                opts._hasNonDnrNegatedType = true;
                if (!opts._nonDnrNegatedTypes) opts._nonDnrNegatedTypes = [];
                opts._nonDnrNegatedTypes.push(key);
            } else {
                opts._hasNonDnrPositiveType = true;
                if (!opts._nonDnrPositiveTypes) opts._nonDnrPositiveTypes = [];
                opts._nonDnrPositiveTypes.push(key);
            }
            break;
        // $empty is an alias for $redirect=empty (exception context resolved later)
        case 'empty':
            opts._emptyAlias = true;
            break;
        // $mp4 is an alias for $redirect=noopmp4-1s,media
        case 'mp4':
            opts._mp4Alias = true;
            if (!neg) opts.types.push('media');
            break;
        // strict1p/strict3p can't be implemented in DNR — uBO's
        // FilterStrictParty.dnrFromCompiled explicitly rejects these.
        // Unlike parser-rejected options, these compile to full error rules in uBO.
        case 'strict1p': case 'strict3p':
            opts._strictParty = key;
            break;
        // $header=value: sets HEADER_BIT in uBO which causes the filter to be
        // rejected from DNR output (FilterFromCompiled.dnrFromCompiled returns undefined).
        // In uBO, the filter compiles but produces no output (no rule, no error).
        // $header (no value): uBO parser rejects this (hasError), producing bare error.
        case 'header':
            if (value) { opts._silentSkip = true; opts._headerValue = value; }
            else opts._unsupported = true;
            break;
        // specifichide: cosmetic filter suppression with no DNR network effect
        case 'shide': case 'specifichide':
            opts.specifichide = true;
            break;
        default:
            // Noop options (underscore placeholders like _,__,___ etc.)
            if (/^_+$/.test(key)) break;
            // Unknown options are unsupported - uBO rejects unrecognized options
            opts._unsupported = true;
            break;
        }
    }

    // Apply the pre-extracted modifier value (replace/uritransform/urltransform)
    if (extractedModifier) {
        const { key: modKey, value: modValue } = extractedModifier;
        if (modKey === 'replace') {
            opts._replace = true;
            opts._replaceValue = modValue;
        } else {
            // uritransform or urltransform
            opts._uritransform = true;
            opts._uritransformValue = modValue;
        }
    }

    // If inline-script/inline-font was the only positive type specified
    // (no other supported types, no $all), the filter has no DNR-representable
    // types. In uBO, the filter compiles but produces no output (no rule, no error).
    if (opts._hasNonDnrPositiveType && opts.types.length === 0 && !opts.all) {
        opts._silentSkip = true;
    }

    return opts;
}

// ============================================================================
// Filter expansion factor computation
// In the OLD (uBO) engine, a single source filter line can produce multiple
// compiled entries. "just-origin" filters produce one entry per domain, and
// explicit type options produce one entry per type bit. The filter stats
// (filterCount, acceptedFilterCount, rejectedFilterCount) count compiled
// entries, not source lines. These helpers compute the expansion factor.
// ============================================================================

// Check if a filter is "just-origin" (uBO's isJustOrigin()).
// Just-origin filters have only domain=/from= as option units, a simple
// pattern (* or |http[s*]://), no regex domains, and no negated domains.
// They produce one compiled entry per positive domain.
function isJustOriginFilter(pattern, opts) {
    // Must have domain=/from= and no other option units.
    // In OLD engine, isJustOrigin() checks optionUnitBits === FROM_BIT,
    // meaning only FROM_BIT is set and no other bits.
    if (opts.domains.length === 0) return false;
    if (opts.toDomains.length > 0) return false;       // TO_BIT
    if (opts.denyallow.length > 0) return false;        // DENYALLOW_BIT
    if (opts._strictParty) return false;                // STRICT_PARTY_BIT
    if (opts.important) return false;                   // IMPORTANT_BIT
    if (opts.csp !== null) return false;                // MODIFY_BIT (csp)
    if (opts.removeparam !== null) return false;         // MODIFY_BIT (removeparam)
    if (opts.redirect !== null) return false;            // MODIFY_BIT (redirect)
    if (opts.permissions !== null) return false;         // MODIFY_BIT (permissions)
    if (opts._emptyAlias) return false;                 // MODIFY_BIT (empty/mp4)
    if (opts._mp4Alias) return false;                   // MODIFY_BIT (mp4)
    if (opts.negatedTypes.length > 0) return false;     // NOT_TYPE_BIT
    if (opts._hasNonDnrNegatedType) return false;       // NOT_TYPE_BIT (inline-font/script)
    if (opts.methods.length > 0) return false;          // METHOD_BIT
    if (opts.negatedMethods.length > 0) return false;   // METHOD_BIT

    // Not regex
    if (pattern.startsWith('/') && pattern.endsWith('/') && pattern.length > 2) return false;

    // No negated or regex domains in domain list
    // (uBO checks /[\/~]/.test(this.fromDomainOpt))
    for (const d of opts.domains) {
        if (d.negated) return false;
        if (d.domain.includes('/')) return false;
    }

    // Pattern check: must be * (or empty) or left-anchored HTTP prefix
    if (pattern === '*' || pattern === '') return true;

    // Left-anchored HTTP pattern: |http://, |https://, |http*://
    // In uBO: anchor must be exactly 0b010 (left anchor only, not ||)
    if (pattern.startsWith('|') && !pattern.startsWith('||')) {
        const p = pattern.slice(1);
        if (/^(?:http[s*]?:(?:\/\/)?)$/.test(p)) return true;
    }

    return false;
}

// Count the number of type bit entries the OLD engine would produce.
// In the OLD engine, compileToAtomicFilter produces:
// - 1 entry if typeBits === 0 (typeless, matches all network types)
// - 1 typeless + N non-network entries if all 11 network type bits are set
// - N entries (one per set bit) otherwise
function computeTypeBitCount(opts) {
    if (opts.all) {
        // $all sets allTypesBits = 11 network types + popup + main_frame + inline-font + inline-script.
        // compileToAtomicFilter collapses the 11 network types into 1 typeless entry,
        // then adds per-type entries for each non-network type. Base count = 5.
        //
        // Negated NON-NETWORK types reduce the count (e.g., ~inline-font, ~popup, ~document).
        // Negated network types (~image, ~script, etc.) have NO effect because the OLD
        // engine preserves all network bits when allNetworkTypesBits is set (line 3631:
        // typeBits &= ~notTypeBits | allNetworkTypesBits).
        //
        // Extra types not in allTypesBits (e.g., $all,popunder) add to the count.
        let count = 5;
        // Subtract negated non-network types
        if (opts._nonDnrNegatedTypes) {
            count -= opts._nonDnrNegatedTypes.length;  // ~inline-font, ~inline-script
        }
        for (const t of opts.negatedTypes) {
            if (t === 'main_frame') count--;  // ~document
        }
        if (opts._negatedPopup) count--;  // ~popup
        // Add types not in allTypesBits
        if (opts._popunder) count++;  // popunder is NOT in allTypesBits
        return count;
    }

    // Collect all positive type bit positions
    // Map from DNR type names to OLD engine bit positions (0-indexed from type value 1)
    const typeBitPosition = {
        'stylesheet': 0, 'image': 1, 'object': 2,
        'script': 3, 'xmlhttprequest': 4, 'sub_frame': 5,
        'font': 6, 'media': 7, 'websocket': 8,
        'ping': 9, 'other': 10,
        // Non-network types:
        'main_frame': 13,
    };

    const bitPositions = new Set();

    for (const t of opts.types) {
        const pos = typeBitPosition[t];
        if (pos !== undefined) bitPositions.add(pos);
    }

    // popup/popunder are tracked separately in opts
    if (opts.popup) bitPositions.add(11);
    if (opts._popunder) bitPositions.add(12);

    // generichide/elemhide/specifichide produce type entries too
    // In uBO: generichide is type 15 (bit 14), specifichide is type 16 (bit 15)
    // elemhide expands to BOTH generichide + specifichide in OLD engine
    if (opts.generichide) bitPositions.add(14);
    if (opts.elemhide) { bitPositions.add(14); bitPositions.add(15); }
    if (opts.specifichide) bitPositions.add(15);

    // inline-font/inline-script (non-DNR types tracked separately)
    if (opts._nonDnrPositiveTypes) {
        for (const t of opts._nonDnrPositiveTypes) {
            if (t === 'inline-font') bitPositions.add(16);
            if (t === 'inline-script') bitPositions.add(17);
        }
    }

    // CSP/permissions without explicit types get implicit main_frame + sub_frame
    // in OLD engine (static-net-filtering.js lines 3638-3648)
    if (bitPositions.size === 0 && (opts.csp !== null || opts.permissions !== null)) {
        bitPositions.add(13); // main_frame
        bitPositions.add(5);  // sub_frame
    }

    if (bitPositions.size === 0) return 1; // Typeless

    let networkCount = 0, nonNetworkCount = 0;
    for (const pos of bitPositions) {
        if (pos <= 10) networkCount++; else nonNetworkCount++;
    }

    // If all 11 network types are set, collapse to 1 typeless entry
    if (networkCount === 11) {
        return 1 + nonNetworkCount;
    }

    return networkCount + nonNetworkCount;
}

// Compute total expansion factor (domains × types)
function computeFilterExpansion(pattern, opts) {
    const domainFactor = isJustOriginFilter(pattern, opts)
        ? opts.domains.filter(d => !d.negated).length || 1
        : 1;
    const typeFactor = computeTypeBitCount(opts);
    return domainFactor * typeFactor;
}

// Compute entry type labels for entry-level dedup.
// In the OLD engine, compileToAtomicFilter produces one compiled entry per type.
// Each entry has a unique identity based on (pattern, type, party, options).
// This function returns the list of type labels for a filter's entries.
function computeEntryTypeLabels(opts) {
    if (opts.all) {
        const labels = ['typeless', 'popup', 'document', 'inline-font', 'inline-script'];
        // Subtract negated non-network types
        if (opts._negatedPopup) { const i = labels.indexOf('popup'); if (i >= 0) labels.splice(i, 1); }
        if (opts.negatedTypes.includes('main_frame')) { const i = labels.indexOf('document'); if (i >= 0) labels.splice(i, 1); }
        if (opts._nonDnrNegatedTypes) {
            for (const t of opts._nonDnrNegatedTypes) {
                if (t === 'inline-font') { const i = labels.indexOf('inline-font'); if (i >= 0) labels.splice(i, 1); }
                if (t === 'inline-script') { const i = labels.indexOf('inline-script'); if (i >= 0) labels.splice(i, 1); }
            }
        }
        if (opts._popunder) labels.push('popunder');
        return labels;
    }

    const labels = [];
    const networkTypes = new Set(['stylesheet', 'image', 'object', 'script', 'xmlhttprequest', 'sub_frame', 'font', 'media', 'websocket', 'ping', 'other']);
    let networkCount = 0;
    const nonNetworkLabels = [];

    for (const t of opts.types) {
        if (networkTypes.has(t)) { networkCount++; labels.push(t); }
        else if (t === 'main_frame') nonNetworkLabels.push('document');
    }
    if (opts.popup) nonNetworkLabels.push('popup');
    if (opts._popunder) nonNetworkLabels.push('popunder');
    if (opts.generichide) nonNetworkLabels.push('generichide');
    if (opts.elemhide) { nonNetworkLabels.push('generichide'); nonNetworkLabels.push('specifichide'); }
    if (opts.specifichide) nonNetworkLabels.push('specifichide');
    if (opts._nonDnrPositiveTypes) {
        for (const t of opts._nonDnrPositiveTypes) labels.push(t);
    }
    if (opts.csp !== null || opts.permissions !== null) {
        if (networkCount === 0 && nonNetworkLabels.length === 0 && !opts._nonDnrPositiveTypes?.length) {
            labels.push('document'); labels.push('sub_frame');
            return labels;
        }
    }

    // If all 11 network types → collapse to typeless + non-network
    if (networkCount === 11) {
        return ['typeless', ...nonNetworkLabels];
    }

    labels.push(...nonNetworkLabels);
    if (labels.length === 0) labels.push('typeless');
    return labels;
}

// Compute the entry base key (everything except type) for entry-level dedup.
function computeEntryBaseKey(exception, pattern, opts) {
    const party = opts.firstParty && opts.thirdParty ? 'any'
                : opts.firstParty ? '1p'
                : opts.thirdParty ? '3p'
                : 'any';
    // Build option fingerprint (non-type options that affect compiled entry identity)
    let optFp = '';
    if (opts.domains.length > 0) optFp += 'F' + opts.domains.map(d => (d.negated ? '~' : '') + d.domain).sort().join('|');
    if (opts.toDomains.length > 0) optFp += 'T' + opts.toDomains.map(d => (d.negated ? '~' : '') + d.domain).sort().join('|');
    if (opts.denyallow.length > 0) optFp += 'D' + opts.denyallow.slice().sort().join('|');
    if (opts.important) optFp += 'I';
    if (opts.matchCase) optFp += 'M';
    if (opts._strictParty) optFp += 'S' + opts._strictParty;
    if (opts.csp !== null) optFp += 'C' + opts.csp;
    if (opts.removeparam !== null) optFp += 'R' + opts.removeparam;
    if (opts.redirect !== null) optFp += 'r' + opts.redirect;
    if (opts.permissions !== null) optFp += 'P' + opts.permissions;
    if (opts.methods.length > 0) optFp += 'm' + opts.methods.sort().join('|');
    if (opts.negatedMethods.length > 0) optFp += 'n' + opts.negatedMethods.sort().join('|');
    // Negated types set NOT_TYPE_BIT in OLD engine, creating FilterNotType wrapper in fdata
    if (opts.negatedTypes.length > 0) optFp += 'N' + opts.negatedTypes.slice().sort().join('|');
    if (opts._nonDnrNegatedTypes?.length > 0) optFp += 'X' + opts._nonDnrNegatedTypes.slice().sort().join('|');
    // $replace and $header values are part of fdata in OLD engine
    if (opts._replaceValue) optFp += 'E' + opts._replaceValue;
    if (opts._headerValue) optFp += 'H' + opts._headerValue;
    return (exception ? '@@' : '') + pattern.toLowerCase() + '\t' + party + '\t' + optFp;
}

// ============================================================================
// Split a network filter line into pattern and options
// ============================================================================

function splitNetworkFilter(line) {
    // Check for exception
    let exception = false;
    if (line.startsWith('@@')) {
        exception = true;
        line = line.slice(2);
    }

    // Find option separator ($) using uBO's indexOfNetAnchor algorithm.
    // Scans from the last $ backward, skipping $ where:
    //   - char after $ is ) / or | (e.g. $domain=/regex/ or $option|option)
    //   - char before $ is \ (escaped $)
    //   - preceding char is also $ ($$)
    let pattern, optionsStr;
    const dollarIdx = indexOfNetAnchor(line);
    if (dollarIdx < line.length) {
        pattern = line.slice(0, dollarIdx);
        optionsStr = line.slice(dollarIdx + 1);
    } else {
        pattern = line;
        optionsStr = '';
    }

    return { exception, pattern, optionsStr };
}

function indexOfNetAnchor(s) {
    // Matches uBO's AstFilterParser.indexOfNetAnchor
    const end = s.length;
    if (end === 0) return end;
    let j = s.lastIndexOf('$');
    if (j === -1) return end;
    if ((j + 1) === end) return end;
    for (;;) {
        const before = j > 0 ? s.charCodeAt(j - 1) : 0;
        if (j !== 0 && before === 0x24 /* $ */) return -1;  // $$ → invalid
        const after = s.charCodeAt(j + 1);
        if (
            after !== 0x29 /* ) */ &&
            after !== 0x2F /* / */ &&
            after !== 0x7C /* | */ &&
            before !== 0x5C /* \ */
        ) {
            return j;
        }
        if (j <= 0) break;
        j = s.lastIndexOf('$', j - 1);
        if (j === -1) break;
    }
    return end;
}

// ============================================================================
// Bare hostname detection (from uBO's reHostnameAscii)
// Matches patterns like "example.com", "46.8.158.80" (no filter syntax)
// ============================================================================

// Case-insensitive: uBO normalizes patterns to lowercase before this check
const reHostnameAscii = /^(?:[\da-z][\da-z_-]*\.)*[\da-z][\da-z-]*[\da-z]$/i;

// ============================================================================
// Hostname-only pattern detection
// Returns the hostname if pattern is ||hostname^ or ||hostname, null otherwise
// ============================================================================

function extractHostnameOnly(urlFilter) {
    // Convert ||hostname^, ||hostname, or ||hostname| patterns to requestDomains
    // (matching uBO's FilterAnchorHn behavior)
    // ||hostname^ → always requestDomains (returns { hostname, hasCaret: true })
    // ||hostname  → requestDomains only when filter has options (returns { hostname, hasCaret: false })
    // ||hostname| → right anchor stripped, treated same as ||hostname^
    if (!urlFilter.startsWith('||')) return null;
    let hn = urlFilter.slice(2); // Remove ||
    let hasCaret = false;
    // Strip trailing anchors: ^ and |
    if (hn.endsWith('^')) {
        hn = hn.slice(0, -1);
        hasCaret = true;
    }
    if (hn.endsWith('|')) {
        hn = hn.slice(0, -1);
        hasCaret = true; // right anchor acts like caret for requestDomains conversion
    }
    // Must be a valid hostname. Two different regexes depending on whether ^ was present:
    // With ^: uses reHnAnchoredHostnameAscii (less strict, 1 char min in last label)
    //   /^(?:[\da-z][\da-z_-]*\.)*[\da-z_-]*[\da-z]$/
    // Without ^: uses reHostnameAscii (stricter, 2 char min in last label)
    //   /^(?:[\da-z][\da-z_-]*\.)*[\da-z][\da-z-]*[\da-z]$/
    const reHn = hasCaret
        ? /^(?:[\da-z][\da-z_-]*\.)*[\da-z_-]*[\da-z]$/i
        : /^(?:[\da-z][\da-z_-]*\.)*[\da-z][\da-z-]*[\da-z]$/i;
    if (!hn || !reHn.test(hn)) return null;
    return { hostname: hn, hasCaret };
}

// Check if parsed options have any non-default values
// Used to determine if ||hostname (without ^) should use requestDomains
function hasAnyFilterOptions(options) {
    return options.domains.length > 0 ||
        options.toDomains.length > 0 ||
        options.types.length > 0 ||
        options.negatedTypes.length > 0 ||
        options.firstParty || options.thirdParty ||
        options.matchCase || options.important ||
        options.all || options.popup ||
        !!options.redirect || !!options.redirectRule ||
        !!options.csp || !!options.permissions ||
        options.denyallow.length > 0 ||
        options.hasRemoveparam ||
        options.generichide || options.elemhide;
}

// Check if parsed options have "option units" in uBO's sense.
// uBO's DOT_TOKEN_HASH path (pure hostname → requestDomains) only fires
// when hasNoOptionUnits() is true. Option units are:
//   IMPORTANT_BIT, NOT_TYPE_BIT, FROM_BIT, TO_BIT, DENYALLOW_BIT,
//   MODIFY_BIT (csp/permissions/redirect/removeparam/replace/urltransform),
//   STRICT_PARTY_BIT, METHOD_BIT, HEADER_BIT
// NOT option units: positive types, party bits, matchCase, all, popup
function hasOptionUnits(options) {
    return options.important ||
        options.negatedTypes.length > 0 ||
        options.domains.length > 0 ||
        options.toDomains.length > 0 ||
        options.denyallow.length > 0 ||
        options.csp !== null ||
        options.permissions !== null ||
        !!options.redirect || !!options.redirectRule ||
        options.hasRemoveparam ||
        !!options._strictParty;
}

// ============================================================================
// Convert a parsed network filter to a DNR rule
// ============================================================================

function networkFilterToDNR(pattern, options, exception, extensionPaths) {
    const rule = {
        action: {},
        condition: {},
    };

    // Determine action type
    if (exception) {
        rule.action.type = 'allow';
    } else {
        rule.action.type = 'block';
    }

    // Resolve $empty and $mp4 aliases now that we know exception context
    if (options._emptyAlias) {
        if (exception) options.redirectRule = 'empty';
        else options.redirect = 'empty';
    }
    if (options._mp4Alias) {
        if (exception) options.redirectRule = 'noopmp4-1s';
        else options.redirect = 'noopmp4-1s';
    }

    // Parse pattern
    let urlFilter = pattern;
    let isRegex = false;

    // Skip patterns with whitespace (uBO classifies these as malformed hosts entries
    // via AST_TYPE_NONE and silently ignores them — they don't count as filters).
    if (/\s/.test(urlFilter) && !(urlFilter.startsWith('/') && urlFilter.endsWith('/'))) {
        return null;
    }

    // Note: Pattern length > 1024 is now checked in the main loop (produces
    // bare error matching uBO's FILTER_UNSUPPORTED behavior).

    // Check for regex pattern (preserve original case for regex)
    if (urlFilter.startsWith('/') && urlFilter.endsWith('/') && urlFilter.length > 2) {
        const regexBody = urlFilter.slice(1, -1);
        // Normalize regex pattern using RegExp.source (matches uBO's normalizeRegexPattern).
        // This escapes unescaped forward slashes and normalizes the pattern.
        let normalized;
        try {
            normalized = new RegExp(regexBody).source;
        } catch {
            rule._error = [`Invalid regex: ${regexBody}`];
            return rule;
        }
        // RE2 compatibility check (matches uBO's sfp.utils.regex.isRE2).
        // RE2 doesn't support lookahead/lookbehind assertions.
        // Check the normalized pattern for (?=, (?!, (?<=, (?<! outside character classes.
        if (/\(\?<?[!=]/.test(normalized)) {
            rule._error = [`regexFilter is not RE2-compatible: ${normalized}`];
            // Type multiplier handled by general error multiplier at end of function
        }
        rule.condition.regexFilter = normalized;
        isRegex = true;
    } else {
        // Lowercase non-regex patterns (matching uBO's normalizePattern behavior)
        urlFilter = urlFilter.toLowerCase();
        // Track whether original pattern has wildcards (before any stripping)
        // uBO checks this on the raw pattern and uses it to gate trailing wildcard stripping
        const hasWildcard = urlFilter.includes('*');

        // Handle || anchor: only valid when 3rd char is a token character
        // (alphanumeric or %). When ||* appears, strip the || since
        // * immediately after negates the anchor.
        if (urlFilter.startsWith('||')) {
            const thirdCharCode = urlFilter.charCodeAt(2) || 0;
            const isToken = (thirdCharCode >= 0x30 && thirdCharCode <= 0x39) ||
                           (thirdCharCode >= 0x41 && thirdCharCode <= 0x5A) ||
                           (thirdCharCode >= 0x61 && thirdCharCode <= 0x7A) ||
                           thirdCharCode === 0x25;
            if (!isToken) {
                urlFilter = urlFilter.slice(2); // Strip meaningless ||
            }
        }

        // Strip leading pointless wildcards: *+<non-token-char>
        // Matches uBO's rePointlessLeadingWildcards = /^(\*+)[^%0-9A-Za-z\u{a0}-\u{10FFFF}]/u
        while (urlFilter.startsWith('*')) {
            const nextCharCode = urlFilter.charCodeAt(1) || 0;
            if (nextCharCode === 0) break; // Just * with nothing after - handle below
            const isTokenOrUnicode = (nextCharCode >= 0x30 && nextCharCode <= 0x39) ||
                                     (nextCharCode >= 0x41 && nextCharCode <= 0x5A) ||
                                     (nextCharCode >= 0x61 && nextCharCode <= 0x7A) ||
                                     nextCharCode === 0x25 ||
                                     nextCharCode >= 0xA0;
            if (isTokenOrUnicode) break; // Keep * when followed by token char
            urlFilter = urlFilter.slice(1);
        }

        // Strip pointless trailing separators: *^** → *
        // uBO's rePointlessTrailingSeparator = /\*(\^\**)$/
        const trailSepMatch = urlFilter.match(/\*(\^\**)$/);
        if (trailSepMatch) {
            urlFilter = urlFilter.slice(0, -trailSepMatch[1].length);
        }

        // Strip pointless trailing wildcards (conditional on original pattern having wildcards)
        // uBO's rePointlessTrailingWildcards = /(?:[^%0-9A-Za-z]|[%0-9A-Za-z]{7,})(\*+)$/
        // Only strips when preceded by non-token char OR 7+ consecutive token chars
        // e.g., "gak*" → kept (3 token chars < 7), "lightbox*" → stripped (8 ≥ 7), "banner/*" → stripped
        // Note: uBO always strips the full ignoreLen regardless of needWildcard
        // (needWildcard only affects AST node types, not the urlFilter)
        if (hasWildcard) {
            const trailWildMatch = urlFilter.match(/(?:[^%0-9A-Za-z]|[%0-9A-Za-z]{7,})(\*+)$/);
            if (trailWildMatch) {
                urlFilter = urlFilter.slice(0, -trailWildMatch[1].length);
            }
        }

        // Normalize Unicode: punycode hostname, percent-encode path
        urlFilter = normalizeUrlFilter(urlFilter);

        // Hostname-only optimization: ||hostname^ or ||hostname → requestDomains
        // In uBO's parser:
        // - ||hostname^ → fast-tracked as HOSTNAME → FilterAnchorHn → requestDomains
        // - ||hostname (no ^, no options, block) → fast-tracked as PLAIN → urlFilter
        // - ||hostname (no ^, with options or exception) → slow path → HOSTNAME → requestDomains
        // The fast-track at reHnAnchoredPlainAscii only matches block filters
        // (@@prefix contains @ which isn't in the fast-track charset)
        const hnOnly = extractHostnameOnly(urlFilter);
        if (hnOnly && (hnOnly.hasCaret || hasAnyFilterOptions(options) || exception)) {
            if (!rule.condition.requestDomains) {
                rule.condition.requestDomains = [];
            }
            rule.condition.requestDomains.push(toPunycode(hnOnly.hostname));
        } else if (urlFilter && urlFilter !== '*') {
            // Normalize scheme patterns: uBO's isJustOrigin/rulesetFromData
            // hardcodes |http:// and |https:// for scheme-only left-anchored patterns
            if (urlFilter === '|http:') urlFilter = '|http://';
            else if (urlFilter === '|https:') urlFilter = '|https://';
            // |http*:// and |http*: match both http and https — uBO treats these
            // as ANY_TOKEN_HASH (no urlFilter), same as bare * pattern
            else if (urlFilter === '|http*://' || urlFilter === '|http*:') urlFilter = null;
            if (urlFilter) rule.condition.urlFilter = urlFilter;
        }
    }

    // Resource types
    if (options.all) {
        // 'all' means match everything - in DNR, omitting resourceTypes means match all.
        // However, if negated non-DNR types are present (e.g., ~inline-font), uBO's
        // FilterNotType always adds excludedResourceTypes:['main_frame'] to the
        // typeless entry. The main_frame type is covered by a separate duplicate.
        if (options._hasNonDnrNegatedType || options.negatedTypes.length > 0) {
            const excluded = new Set(options.negatedTypes);
            excluded.add('main_frame');
            rule.condition.excludedResourceTypes = [...excluded];
        }
    } else if (options.types.length > 0) {
        rule.condition.resourceTypes = [...new Set(options.types)];
    } else if (options.negatedTypes.length > 0) {
        const excluded = new Set(options.negatedTypes);
        excluded.add('main_frame'); // Always exclude main_frame for negated types
        rule.condition.excludedResourceTypes = [...excluded];
    }

    // Party matching
    if (options.firstParty && !options.thirdParty) {
        rule.condition.domainType = 'firstParty';
    } else if (options.thirdParty && !options.firstParty) {
        rule.condition.domainType = 'thirdParty';
    }

    // Initiator domains (from domain= or from= option)
    // uBO's parser rejects the entire filter when a domain contains * in a
    // non-entity position (e.g., "matichon*.com"). Entity domains (e.g.,
    // "filma24.*") are valid syntax but can't be represented in DNR.
    // Regex domains (e.g., "/^pattern$/") are also unsupported.
    const isSyntacticallyBadDomain = hn => hn.includes('*') && !hn.endsWith('.*');
    if (options.domains.some(d => isSyntacticallyBadDomain(d.domain)) ||
        options.toDomains.some(d => isSyntacticallyBadDomain(d.domain))) {
        rule._error = ['Invalid domain option'];
        return rule;
    }
    const isUnsupportedDomain = hn => hn.endsWith('.*') || hn.startsWith('/');
    const initInclude = options.domains.filter(d => !d.negated && !isUnsupportedDomain(d.domain)).map(d => d.domain);
    const initExclude = options.domains.filter(d => d.negated && !isUnsupportedDomain(d.domain)).map(d => d.domain);
    // Compute isJustOrigin merge key for both valid and error rules.
    // In uBO, isJustOrigin() filters with the same (realm, party, type, tokenHash)
    // share a merged rule. When ALL domains in the merged rule are entities, it
    // produces an error. When at least one domain is valid, the rule is valid
    // (entities are stripped with a warning). We tag both cases with a merge key
    // so that in finalizeRuleset, entity-only error rules that share a merge group
    // with a valid rule can be absorbed (producing 0 error entries for that group).
    const computeJustOriginKey = () => {
        const isRegex = pattern.startsWith('/') && pattern.endsWith('/') && pattern.length > 2;
        const hasNegatedDomains = options.domains.some(d => d.negated);
        const onlyFromBit = !options.important &&
            options.negatedTypes.length === 0 &&
            !options._hasNonDnrNegatedType &&
            options.toDomains.length === 0 &&
            options.denyallow.length === 0 &&
            options.csp === null &&
            options.permissions === null &&
            !options.redirect && !options.redirectRule &&
            !options.hasRemoveparam &&
            !options._strictParty &&
            options.methods.length === 0 &&
            options.negatedMethods.length === 0 &&
            !options.header &&
            !options._replace &&
            !options._uritransform;
        const justOriginPattern = pattern === '*' ||
            /^\|https?:(?:\/\/)?$/.test(pattern) ||
            pattern === '|http*:' || pattern === '|http*://';
        if (!isRegex && !hasNegatedDomains && onlyFromBit && justOriginPattern) {
            const actionKey = exception ? 'allow' : 'block';
            const partyKey = options.firstParty && !options.thirdParty ? '1p'
                : !options.firstParty && options.thirdParty ? '3p' : 'any';
            let tokenKey;
            if (pattern === '*' || pattern.startsWith('|http*')) {
                tokenKey = 'any';
            } else if (pattern.startsWith('|https')) {
                tokenKey = 'https';
            } else {
                tokenKey = 'http';
            }
            let typeKey;
            if (options.all) {
                typeKey = 'all';
            } else if (options.types.length > 0) {
                typeKey = options.types.sort().join(',');
            } else {
                typeKey = 'typeless';
            }
            return `${actionKey}|${partyKey}|${tokenKey}|${typeKey}`;
        }
        return null;
    };
    if (initInclude.length > 0) {
        rule.condition.initiatorDomains = initInclude;
        // Tag ALL valid isJustOrigin rules so their merge key can absorb
        // entity-only error rules from other filters in the same merge group.
        // In uBO, ALL just-origin filters in the same (action, party, token,
        // type) bucket share a merged rule, so any valid rule absorbs all
        // entity-only errors in its bucket — not just mixed-domain rules.
        const key = computeJustOriginKey();
        if (key !== null) {
            rule._justOriginMergeKey = key;
        }
    } else if (options.domains.some(d => !d.negated)) {
        // All positive domains were unsupported (entities/regex) - can't represent in DNR.
        rule._error = ['All initiator domains are unsupported'];
        const key = computeJustOriginKey();
        if (key !== null) {
            rule._justOriginMergeKey = key;
        }
    }
    if (initExclude.length > 0) {
        rule.condition.excludedInitiatorDomains = initExclude;
    }
    // Track if the original filter had domain options (FROM_BIT in uBO).
    // Even after entity domain removal, this affects token hash classification:
    // FROM_BIT prevents DOT_TOKEN_HASH and ANY_TOKEN_HASH in uBO.
    if (options.domains.length > 0) {
        rule._hadFromBit = true;
    }

    // Request domains (from to= option)
    const reqInclude = options.toDomains.filter(d => !d.negated && !isUnsupportedDomain(d.domain)).map(d => d.domain);
    const reqExclude = options.toDomains.filter(d => d.negated && !isUnsupportedDomain(d.domain)).map(d => d.domain);
    if (reqInclude.length > 0) {
        rule.condition.requestDomains = reqInclude;
    } else if (options.toDomains.some(d => !d.negated)) {
        // All positive to= domains were unsupported (entities/regex) - can't represent in DNR.
        rule._error = ['All request domains are unsupported'];
        // Don't set _errorMultiplier here; let the general error multiplier at the end handle it
    }
    if (reqExclude.length > 0) {
        rule.condition.excludedRequestDomains = reqExclude;
    }

    // Denyallow → excluded request domains (both block and allow rules)
    if (options.denyallow.length > 0) {
        if (!rule.condition.excludedRequestDomains) {
            rule.condition.excludedRequestDomains = [];
        }
        rule.condition.excludedRequestDomains.push(...options.denyallow);
    }

    // Case sensitivity
    if (options.matchCase) {
        rule.condition.isUrlFilterCaseSensitive = true;
    }

    // Methods
    if (options.methods.length > 0) {
        rule.condition.requestMethods = options.methods;
    }
    if (options.negatedMethods.length > 0) {
        rule.condition.excludedRequestMethods = options.negatedMethods;
    }

    // Handle modifiers: redirect, removeparam, csp, permissions
    // (must come before important check to determine if rule is a modifier)
    // Mark modifier filters so getTokenCategory always classifies them as EMPTY,
    // matching uBO's MODIFY_BIT which prevents DOT/ANY classification.
    // This is critical for error rules where action.type may not be set to 'redirect'
    // or 'modifyHeaders', but the filter IS a modifier in uBO's compilation.
    if (options.redirect !== null || options.redirectRule !== null ||
        options.hasRemoveparam || options.csp !== null || options.permissions !== null) {
        rule._isModifier = true;
    }
    if (options.redirect !== null || options.redirectRule !== null) {
        if (options.redirectRule !== null) {
            // $redirect-rule= is excluded by the OLD build (badTypes includes
            // NODE_TYPE_NET_OPTION_NAME_REDIRECTRULE). DNR doesn't support
            // conditional redirects (redirect only when a block filter matches).
            rule._error = ['Incompatible redirect-rule option'];
        } else if (exception) {
            // Exception redirect filters are dropped in the OLD build output.
            // uBO internally converts them to block rules with higher priority,
            // but the post-processing in generateDNR filters them out.
            rule._error = ['Unsupported redirect exception'];
        } else {
            let redirectName = options.redirect;
            let customPriority = 0;
            // Handle priority suffix: redirect=name:N
            const prioMatch = /:(\d+)$/.exec(redirectName);
            if (prioMatch) {
                customPriority = parseInt(prioMatch[1], 10);
                redirectName = redirectName.slice(0, prioMatch.index);
            }
            const extensionPath = extensionPaths.get(redirectName);
            if (extensionPath) {
                rule.action.type = 'redirect';
                rule.action.redirect = { extensionPath };
                rule.priority = (rule.priority || 1) + customPriority + 1;
            } else {
                // In uBO, even when the redirect token is unresolvable, the action type
                // is still set to 'redirect' (with the raw token as extensionPath).
                // This matters for $important: block-important rules are dropped, but
                // redirect-important rules (even errored ones) are kept in REDIRECT_REALM.
                rule.action.type = 'redirect';
                rule.action.redirect = { extensionPath: redirectName };
                rule.priority = (rule.priority || 1) + customPriority + 1;
                rule._error = [`Unpatchable redirect filter: ${redirectName}`];
            }
        }
    } else if (options.hasRemoveparam) {
        if (exception) {
            // Exception removeparam filters don't produce standalone DNR rules.
            // In uBO, they patch the matching block removeparam rules' conditions.
            rule._error = ['Unsupported removeparam exception'];
        } else {
            rule.action.type = 'redirect';
            // $removeparam=| means strip entire query string (same as bare $removeparam)
            if (options.removeparam === '|') {
                options.removeparam = '';
            }
            if (options.removeparam) {
                rule.action.redirect = {
                    transform: {
                        queryTransform: {
                            removeParams: [options.removeparam],
                        },
                    },
                };
                // Regex-based removeparam is unsupported in DNR
                if (/^~?\/.+\/$/.test(options.removeparam)) {
                    rule._error = [`Unsupported regex-based removeParam: ${options.removeparam}`];
                }
            } else {
                rule.action.redirect = {
                    transform: { query: '' },
                };
            }
            // Default resource types for removeparam — delay until after sorting.
            // In uBO, typeless modifier rules stay in the no_type bucket during
            // the per-type iteration, and get default types added AFTER iteration.
            // We mark them here and add types after sorting to preserve no_type position.
            if (!options.types.length && !options.negatedTypes.length && !options.all) {
                rule._defaultTypes = ['main_frame', 'sub_frame', 'xmlhttprequest'];
            }
        }
    } else if (options.csp !== null) {
        if (exception) {
            // CSP exceptions are not supported in DNR.
            // In uBO, CSP filters with no explicit type get doc+frame types added
            // (processTypeOption for DOC and FRAME), creating 2 per-type entries in
            // compileToAtomicFilter. Each produces a separate rule with the csp error.
            rule._error = ['Unsupported csp exception'];
            if (!options.types.length && !options.negatedTypes.length && !options.all) {
                rule._errorMultiplier = 2;
            }
        } else {
            rule.action.type = 'modifyHeaders';
            rule.action.responseHeaders = [{
                header: 'content-security-policy',
                operation: 'append',
                value: options.csp,
            }];
            // CSP implicitly applies only to document/subdocument
            if (!options.types.length && !options.negatedTypes.length && !options.all) {
                rule._defaultTypes = ['main_frame', 'sub_frame'];
                // In uBO, CSP types are added via processTypeOption BEFORE
                // compileToAtomicFilter, so per-type entries exist before the
                // DNR error check. If already errored (e.g., entity domains),
                // replicate the per-type count.
                if (rule._error && !rule._errorMultiplier) {
                    rule._errorMultiplier = 2;
                }
            }
        }
    } else if (options.permissions !== null) {
        if (exception) {
            rule._error = ['Unsupported permissions exception'];
            // Like CSP, permissions filters without explicit types get doc+frame in uBO
            if (!options.types.length && !options.negatedTypes.length && !options.all) {
                rule._errorMultiplier = 2;
            }
        } else {
            rule.action.type = 'modifyHeaders';
            rule.action.responseHeaders = [{
                header: 'permissions-policy',
                operation: 'append',
                value: options.permissions.split('|').join(', '),
            }];
            // Permissions implicitly applies only to document/subdocument
            if (!options.types.length && !options.negatedTypes.length && !options.all) {
                rule._defaultTypes = ['main_frame', 'sub_frame'];
                // Same as CSP: permissions types are added before per-type
                // compilation in uBO.
                if (rule._error && !rule._errorMultiplier) {
                    rule._errorMultiplier = 2;
                }
            }
        }
    }

    // Important flag: in uBO's DNR code, $important block rules (BLOCKIMPORTANT_REALM)
    // are not enumerated in the output - only $important combined with modifiers
    // (redirect, removeparam, csp) produces output. Failed redirects still have
    // action.type='redirect' (set above), so they pass this check and are kept.
    if (options.important) {
        if (rule.action.type === 'block') {
            return null;
        }
        rule.priority = (rule.priority || 1) + 10;
    }

    // General error multiplier: in uBO, compileToAtomicFilter creates one
    // compiled entry per type. When an error is set in dnrFromCompiled, each
    // per-type entry produces a separate error rule in the output. If
    // _errorMultiplier is not already set (CSP/permissions exception handlers
    // set their own), compute it from the type count.
    if (rule._error && !rule._errorMultiplier) {
        let typeCount;
        if (options.all) {
            // $all: typeless entry + main_frame = 2
            typeCount = 2;
        } else if (options.types.length > 1) {
            typeCount = options.types.length;
        } else {
            typeCount = 1;
        }
        if (typeCount > 1) {
            rule._errorMultiplier = typeCount;
        }
    }

    return rule;
}

// ============================================================================
// Rule merger - merge DNR rules with identical conditions/actions
// ============================================================================

function finalizeRuleset(rules, invalidFilters, bareInvalidFilters) {
    // Assign initial rule ids
    const rulesetMap = new Map();
    let ruleId = 1;
    for (const rule of rules) {
        rulesetMap.set(ruleId++, rule);
    }

    // Merge rules where possible by merging arrays of a specific property
    const mergeRules = (rulesetMap, mergeTarget) => {
        const mergeMap = new Map();
        const sorter = (_, v) => {
            if (Array.isArray(v)) {
                return typeof v[0] === 'string' ? v.sort() : v;
            }
            if (v instanceof Object) {
                const sorted = {};
                for (const kk of Object.keys(v).sort()) {
                    sorted[kk] = v[kk];
                }
                return sorted;
            }
            return v;
        };
        const ruleHasher = (rule, target) => {
            return JSON.stringify(rule, (k, v) => {
                if (k.startsWith('_')) { return; }
                if (k === target) { return; }
                return sorter(k, v);
            });
        };
        const extractTargetValue = (obj, target) => {
            for (const [k, v] of Object.entries(obj)) {
                if (Array.isArray(v) && k === target) { return v; }
                if (v instanceof Object) {
                    const r = extractTargetValue(v, target);
                    if (r !== undefined) { return r; }
                }
            }
        };
        const extractTargetOwner = (obj, target) => {
            for (const [k, v] of Object.entries(obj)) {
                if (Array.isArray(v) && k === target) { return obj; }
                if (v instanceof Object) {
                    const r = extractTargetOwner(v, target);
                    if (r !== undefined) { return r; }
                }
            }
        };
        for (const [id, rule] of rulesetMap) {
            if (rule._error !== undefined) { continue; }
            const hash = ruleHasher(rule, mergeTarget);
            if (mergeMap.has(hash) === false) {
                mergeMap.set(hash, []);
            }
            mergeMap.get(hash).push(id);
        }
        for (const ids of mergeMap.values()) {
            if (ids.length === 1) { continue; }
            const leftHand = rulesetMap.get(ids[0]);
            const leftHandSet = new Set(
                extractTargetValue(leftHand, mergeTarget) || []
            );
            for (let i = 1; i < ids.length; i++) {
                const rightHandId = ids[i];
                const rightHand = rulesetMap.get(rightHandId);
                const rightHandArray = extractTargetValue(rightHand, mergeTarget);
                if (rightHandArray !== undefined) {
                    if (leftHandSet.size !== 0) {
                        for (const item of rightHandArray) {
                            leftHandSet.add(item);
                        }
                    }
                } else {
                    leftHandSet.clear();
                }
                // Transfer _justOriginMergeKey from merged-away rules.
                // When a just-origin rule (with merge key) is merged into a
                // non-just-origin rule (without key), the key must be preserved
                // so it can absorb entity-only error rules during finalization.
                if (rightHand._justOriginMergeKey && !leftHand._justOriginMergeKey) {
                    leftHand._justOriginMergeKey = rightHand._justOriginMergeKey;
                }
                rulesetMap.delete(rightHandId);
            }
            const leftHandOwner = extractTargetOwner(leftHand, mergeTarget);
            if (leftHandSet.size > 1) {
                leftHandOwner[mergeTarget] = Array.from(leftHandSet).sort();
            } else if (leftHandSet.size === 0) {
                if (leftHandOwner !== undefined) {
                    leftHandOwner[mergeTarget] = undefined;
                }
            }
        }
    };

    mergeRules(rulesetMap, 'resourceTypes');
    mergeRules(rulesetMap, 'initiatorDomains');
    mergeRules(rulesetMap, 'requestDomains');
    mergeRules(rulesetMap, 'removeParams');
    mergeRules(rulesetMap, 'responseHeaders');

    // Reassign IDs and finalize.
    // isJustOrigin merging: in uBO, isJustOrigin() filters with the same
    // (realm, party, type, tokenHash) share a merged rule. This means:
    // 1. Multiple entity-only filters in the same group → 1 error entry (dedup)
    // 2. If ANY filter in the group has valid domains → the merged rule is valid,
    //    absorbing all entity-only filters (they produce 0 error entries)
    //
    // First pass: collect merge keys from valid rules (they absorb error rules)
    const validMergeKeys = new Set();
    for (const rule of rulesetMap.values()) {
        if (rule._error === undefined && rule._justOriginMergeKey !== undefined) {
            validMergeKeys.add(rule._justOriginMergeKey);
        }
    }
    const justOriginErrorSeen = new Set();
    const rulesetFinal = [];
    ruleId = 1;
    for (const rule of rulesetMap.values()) {
        if (rule._error === undefined) {
            rule.id = ruleId++;
        } else {
            if (rule._justOriginMergeKey !== undefined) {
                // Absorbed: a valid rule in the same merge group already exists
                if (validMergeKeys.has(rule._justOriginMergeKey)) {
                    continue;
                }
                // Deduplicated: only keep first error rule per merge group
                if (justOriginErrorSeen.has(rule._justOriginMergeKey)) {
                    continue;
                }
                justOriginErrorSeen.add(rule._justOriginMergeKey);
            }
            rule.id = 0;
            // Error multiplier: in uBO, compileToAtomicFilter creates per-type
            // entries for typed filters. Each produces a separate error entry.
            // Replicate by creating additional bare entries.
            const multiplier = rule._errorMultiplier || 1;
            for (let i = 1; i < multiplier; i++) {
                rulesetFinal.push({ _error: rule._error });
            }
        }
        rulesetFinal.push(rule);
    }

    // Append bare error entries from parser-rejected filters.
    // In uBO, context.invalid collects error messages from filters rejected
    // at the parser level (e.g., $replace, $redirect-rule, bad CSS selectors).
    // These are appended as bare { _error: [...] } entries after all real rules,
    // contributing to rules.total but not to rules.plain.
    if (bareInvalidFilters) {
        for (const invalid of bareInvalidFilters) {
            rulesetFinal.push({ _error: [invalid] });
        }
    }

    return rulesetFinal;
}

// ============================================================================
// Parse scriptlet injection filter: ##+js(name, arg1, arg2)
// ============================================================================

function parseScriptletArgs(content) {
    // content is everything after ##
    // Should start with +js(
    if (!content.startsWith('+js(') || !content.endsWith(')')) return null;

    const argsStr = content.slice(4, -1);
    // Parse arguments using the same logic as uBO's ArgListParser:
    // 1. Skip leading whitespace
    // 2. If arg starts with quote (' " `), find matching close quote — content between quotes is the arg
    // 3. If unquoted, find next unescaped comma — text up to comma (trimmed) is the arg
    // 4. In unquoted mode, \, escapes the comma (backslash is removed in normalization)
    const args = [];
    let pos = 0;
    const len = argsStr.length;

    let lastWasComma = false;
    while (pos < len) {
        // Skip leading whitespace
        while (pos < len && /\s/.test(argsStr[pos])) pos++;
        if (pos >= len) break;

        const qc = argsStr.charCodeAt(pos);
        let argText;
        let quoted = false;

        if (qc === 34 || qc === 39 || qc === 0x60) { // " ' `
            // Try quoted argument - find matching close quote (match uBO's ArgListParser)
            const quoteChar = argsStr[pos];
            let end = pos + 1;
            let foundClose = false;
            while (end < len) {
                const epos = argsStr.indexOf(quoteChar, end);
                if (epos === -1) { end = len; break; }
                // Check if preceded by odd number of backslashes (escaped quote)
                let bsCount = 0;
                let bp = epos - 1;
                while (bp >= pos + 1 && argsStr[bp] === '\\') { bsCount++; bp--; }
                if (bsCount % 2 === 0) {
                    // Not escaped — this is the closing quote
                    end = epos;
                    foundClose = true;
                    break;
                }
                end = epos + 1;
            }
            if (foundClose) {
                // Closing quote found — check if followed by comma/whitespace+comma/end
                let afterQuote = end + 1;
                while (afterQuote < len && /\s/.test(argsStr[afterQuote])) afterQuote++;
                if (afterQuote === len || argsStr[afterQuote] === ',') {
                    // Valid quoted arg — extract text between quotes
                    argText = argsStr.slice(pos + 1, end);
                    argText = unescapeArgSeparator(argText, quoteChar);
                    pos = afterQuote;
                    lastWasComma = (pos < len && argsStr[pos] === ',');
                    if (lastWasComma) pos++;
                    quoted = true;
                }
                // If NOT followed by comma/end, fall through to unquoted parsing
            }
            // If no closing quote found, fall through to unquoted parsing
        }

        if (!quoted) {
            // Unquoted argument - find next unescaped comma
            let end = pos;
            while (end < len) {
                const commaPos = argsStr.indexOf(',', end);
                if (commaPos === -1) { end = len; break; }
                // Check if preceded by odd number of backslashes (escaped comma)
                let bsCount = 0;
                let bp = commaPos - 1;
                while (bp >= pos && argsStr[bp] === '\\') { bsCount++; bp--; }
                if (bsCount % 2 === 0) {
                    // Not escaped — this is the separator
                    end = commaPos;
                    break;
                }
                end = commaPos + 1;
            }
            argText = argsStr.slice(pos, end).trim();
            // Remove escape backslashes before commas
            argText = unescapeArgSeparator(argText, ',');
            pos = end;
            lastWasComma = (pos < len && argsStr[pos] === ',');
            if (lastWasComma) pos++;
        }

        args.push(argText);
    }

    // Handle trailing empty arg (e.g., "Math.random," → ["Math.random", ""])
    if (lastWasComma) {
        args.push('');
    }

    return args;
}

// Remove escape backslashes before a specific character (uBO's normalizeArg)
function unescapeArgSeparator(s, char) {
    if (!s.includes(char)) return s;
    let out = '';
    let pos = 0;
    while (true) {
        const idx = s.indexOf(char, pos);
        if (idx === -1) break;
        // Count backslashes before the char
        let bsCount = 0;
        let bp = idx - 1;
        while (bp >= pos && s[bp] === '\\') { bsCount++; bp--; }
        // Remove one backslash if odd count (the escape backslash)
        if (bsCount > 0 && bsCount % 2 !== 0) {
            out += s.slice(pos, idx - 1) + char;
        } else {
            out += s.slice(pos, idx + 1);
        }
        pos = idx + 1;
    }
    out += s.slice(pos);
    return out;
}

// Parse AdGuard scriptlet args: //scriptlet('name', 'arg1', 'arg2')
// AdGuard uses single-quoted, comma-separated args (mustQuote mode)
function parseAdGuardScriptletArgs(argsStr) {
    const args = [];
    let pos = 0;
    const len = argsStr.length;
    while (pos < len) {
        // Skip whitespace
        while (pos < len && /\s/.test(argsStr[pos])) pos++;
        if (pos >= len) break;
        const qc = argsStr.charCodeAt(pos);
        if (qc === 39 || qc === 34 || qc === 0x60) { // ' " `
            // Quoted arg
            const quoteChar = argsStr[pos];
            let end = pos + 1;
            while (end < len && argsStr[end] !== quoteChar) {
                if (argsStr[end] === '\\') end++;
                end++;
            }
            args.push(argsStr.slice(pos + 1, end));
            pos = end + 1;
            // Skip whitespace and comma
            while (pos < len && /\s/.test(argsStr[pos])) pos++;
            if (pos < len && argsStr[pos] === ',') pos++;
        } else {
            // Unquoted (shouldn't happen in AdGuard but handle anyway)
            const commaPos = argsStr.indexOf(',', pos);
            const end = commaPos === -1 ? len : commaPos;
            args.push(argsStr.slice(pos, end).trim());
            pos = end;
            if (pos < len && argsStr[pos] === ',') pos++;
        }
    }
    return args;
}

// Convert AdGuard scriptlet name to uBO scriptlet name
function convertAdGuardScriptletName(adgName) {
    // AdGuard names: 'set-constant', 'abort-on-property-read', etc.
    // uBO names are the same but suffixed with .js in the build output
    // The names are identical between AdGuard and uBO for most scriptlets
    return adgName;
}

// ============================================================================
// Normalize a filter line for $badfilter matching.
// uBO matches badfilter against compiled representations where aliases are
// resolved and patterns are lowercased. Our text-based approach needs to
// canonicalize both the badfilter target and original filter lines so that
// alias variants (3p/third-party, frame/subdocument, from/domain, etc.)
// and case differences in patterns all match correctly.
// ============================================================================

const badfilterOptionAliases = {
    '3p': 'third-party',
    '1p': 'first-party',
    'xhr': 'xmlhttprequest',
    'frame': 'subdocument',
    'css': 'stylesheet',
    'doc': 'document',
    'from': 'domain',
    'queryprune': 'removeparam',
    'rewrite': 'redirect',
    'beacon': 'ping',
    'object-subrequest': 'object',
    'ghide': 'generichide',
    'ehide': 'elemhide',
    'shide': 'specifichide',
};

function normalizeForBadfilter(line) {
    const dollarIdx = line.lastIndexOf('$');
    if (dollarIdx < 0) return line.toLowerCase();

    const pattern = line.slice(0, dollarIdx).toLowerCase();
    const optPart = line.slice(dollarIdx + 1).toLowerCase();

    const opts = optPart.split(',').map(opt => {
        opt = opt.trim();
        if (!opt) return opt;
        const neg = opt.startsWith('~') ? '~' : '';
        const rest = neg ? opt.slice(1) : opt;
        const eqIdx = rest.indexOf('=');
        let key, value;
        if (eqIdx >= 0) {
            key = rest.slice(0, eqIdx);
            value = rest.slice(eqIdx); // includes '='
        } else {
            key = rest;
            value = '';
        }
        return neg + (badfilterOptionAliases[key] || key) + value;
    }).filter(o => o);

    opts.sort();

    return opts.length > 0 ? `${pattern}$${opts.join(',')}` : pattern;
}

// Extract per-domain badfilter info from a normalized badfilter target.
// Returns { key, domains[] } where key is the normalized line without the
// domain option, and domains is the list of non-negated domains to remove.
// Multi-domain badfilters (domain=a|b|c) return all domains.
function extractPerDomainBadfilter(normalizedLine) {
    const dollarIdx = normalizedLine.lastIndexOf('$');
    if (dollarIdx < 0) return null;

    let patternPart = normalizedLine.slice(0, dollarIdx);
    const optPart = normalizedLine.slice(dollarIdx + 1);
    const opts = optPart.split(',');

    // Already normalized: 'from' → 'domain'
    const domainOpt = opts.find(o => o.startsWith('domain='));
    if (!domainOpt) return null;

    const domainValue = domainOpt.slice('domain='.length);
    if (!domainValue) return null;

    // Extract all non-negated domains
    const domains = domainValue.split('|').filter(d => d && !d.startsWith('~'));
    if (domains.length === 0) return null;

    const otherOpts = opts.filter(o => !o.startsWith('domain='));
    otherOpts.sort();

    // Normalize pattern: `*` and empty are equivalent in uBO (ANY_TOKEN_HASH)
    if (patternPart === '*') patternPart = '';

    const key = otherOpts.length > 0
        ? `${patternPart}$${otherOpts.join(',')}`
        : patternPart;

    return { key, domains };
}

// Compute the badfilter key for a filter line (pattern + options without domain).
function computeBadfilterKey(normalizedLine) {
    const dollarIdx = normalizedLine.lastIndexOf('$');
    if (dollarIdx < 0) return normalizedLine;

    let patternPart = normalizedLine.slice(0, dollarIdx);
    const optPart = normalizedLine.slice(dollarIdx + 1);
    const otherOpts = optPart.split(',').filter(o => !o.startsWith('domain='));
    otherOpts.sort();

    // Normalize pattern: in uBO, both `*` and empty pattern compile to
    // ANY_TOKEN_HASH, so `*$popup,3p` and `$popup,3p` are equivalent.
    if (patternPart === '*') patternPart = '';

    return otherOpts.length > 0 ? `${patternPart}$${otherOpts.join(',')}` : patternPart;
}

// ============================================================================
// Main engine: process filter lists and produce structured output
// ============================================================================

export async function processFilterLists(lists, options = {}) {
    const env = options.env || [];
    const extensionPaths = options.extensionPaths || buildExtensionPaths();
    const secret = options.secret;
    const nativeCssHas = env.includes('native_css_has');

    const context = {
        invalid: new Set(),
        bareInvalid: new Set(),
        filterCount: 0,
        acceptedFilterCount: 0,
        rejectedFilterCount: 0,
        generichideExclusions: [],
        seenFilterLines: new Set(),
        seenEntries: new Set(),
    };

    const dnrRules = [];
    const responseHeaderRules = [];
    const genericCosmeticFilters = new Map();
    const genericHighCosmeticFilters = new Set();
    const genericCosmeticExceptions = new Set();
    const specificCosmeticFilters = new Map();
    const scriptletFilters = new Map();

    for (const list of lists) {
        // Preprocess text (handle !#if/!#endif)
        const text = prune(list.text, env);
        const currentListName = list.name || '?';

        let trustedSource = false;
        const lines = text.split(/\r?\n/);

        // First pass: collect badfilter targets
        // A badfilter cancels the matching filter (same line without $badfilter option)
        const badFilterTargets = new Set();
        // Per-domain badfilter: maps key (pattern+options without domain) → Set of domains
        // In uBO, multi-domain filters are compiled to per-domain atomic entries,
        // so a badfilter with domain=X removes just X from a multi-domain filter.
        const perDomainBadfilters = new Map();
        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
            let line = lines[lineIdx];
            while (line.endsWith(' \\') && lineIdx + 1 < lines.length) {
                const nextLine = lines[lineIdx + 1];
                if (!nextLine.startsWith('    ')) break;
                lineIdx++;
                line = line.slice(0, -2).trim() + nextLine.trim();
            }
            line = line.trim();
            if (!line || line.startsWith('!') || line.startsWith('[')) continue;
            if (!line.includes('badfilter')) continue;
            // Extract the target: remove $badfilter from options
            const dollarIdx = line.lastIndexOf('$');
            if (dollarIdx < 0) continue;
            const optPart = line.slice(dollarIdx + 1);
            if (!optPart.split(',').some(o => o.trim() === 'badfilter')) continue;
            // Reconstruct the target filter line without 'badfilter' option,
            // then normalize so aliases and case match the original filter line
            const opts = optPart.split(',').filter(o => o.trim() !== 'badfilter').join(',');
            const target = opts ? `${line.slice(0, dollarIdx)}$${opts}` : line.slice(0, dollarIdx);
            const normalizedTarget = normalizeForBadfilter(target);
            badFilterTargets.add(normalizedTarget);

            // Per-domain: if target has a single domain, also index for
            // per-domain removal from multi-domain filters
            const extracted = extractPerDomainBadfilter(normalizedTarget);
            if (extracted) {
                if (!perDomainBadfilters.has(extracted.key)) {
                    perDomainBadfilters.set(extracted.key, new Set());
                }
                for (const d of extracted.domains) {
                    perDomainBadfilters.get(extracted.key).add(d);
                }
            }
        }

        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
            let line = lines[lineIdx];

            // Handle line continuations
            while (line.endsWith(' \\') && lineIdx + 1 < lines.length) {
                const nextLine = lines[lineIdx + 1];
                if (!nextLine.startsWith('    ')) break;
                lineIdx++;
                line = line.slice(0, -2).trim() + nextLine.trim();
            }

            line = line.trim();
            if (!line) continue;

            // Comments: ABP-style (!), hosts-file-style (# ), section headers ([)
            // Note: [$...] is a valid filter option prefix (e.g. [$domain=...]##selector)
            // so don't skip lines starting with [$
            if (line.startsWith('!') || (line.startsWith('[') && !line.startsWith('[$'))) {
                // Check for trusted directives
                if (secret && line === `!#trusted on ${secret}`) {
                    trustedSource = true;
                } else if (secret && line === `!#trusted off ${secret}`) {
                    trustedSource = false;
                }
                continue;
            }
            // Hosts-file style comments: "# comment" (but NOT "##" which is a cosmetic filter)
            // Match uBO's pattern: /^(?:#\s|####)/
            if (line.charAt(0) === '#') {
                if (line.charAt(1) === ' ' || (line.length < 2)) {
                    continue;
                }
                // "####" or more - uBO treats these as comments
                if (line.startsWith('####')) {
                    continue;
                }
            }

            // Hosts-file format: "127.0.0.1 domain.com" or "0.0.0.0 domain.com"
            const hostsMatch = /^(?:127\.0\.0\.1|0\.0\.0\.0) +([\da-z][\da-z_.-]*[\da-z])$/i.exec(line);
            if (hostsMatch) {
                // Strip inline comment if any
                const hostname = hostsMatch[1];
                // Convert to hostname-anchored blocking filter: ||domain^
                line = `||${hostname}^`;
            }

            // Lines canceled by whole-line badfilter: In the OLD engine, these filters
            // compile to GOOD entries (counted in filterCount) but then match BAD entries
            // (counted in rejectedFilterCount). Parse to compute expansion.
            if (badFilterTargets.has(normalizeForBadfilter(line))) {
                // Only count network filters (not extended/cosmetic)
                if (!findExtendedSeparator(line)) {
                    const { exception: e0, pattern: p0, optionsStr: o0 } = splitNetworkFilter(line);
                    const opts0 = parseNetworkOptions(o0);
                    if (!opts0.badfilter) {
                        const exp0 = computeFilterExpansion(p0, opts0);
                        context.filterCount += exp0;
                        // Compute dedup key from normalized form (handles bare hostname → ||hostname^)
                        let p0n = p0;
                        if (!e0 && !o0 && reHostnameAscii.test(p0)) p0n = `||${p0.toLowerCase()}^`;
                        const dedupKey = normalizeForBadfilter((e0 ? '@@' : '') + p0n + (o0 ? '$' + o0 : ''));
                        if (!context.seenFilterLines.has(dedupKey)) {
                            context.seenFilterLines.add(dedupKey);
                            context.rejectedFilterCount += exp0;
                        }
                    }
                }
                continue;
            }

            // Try extended filter first
            const ext = findExtendedSeparator(line);
            if (ext) {
                processExtendedFilter(ext, line, trustedSource, nativeCssHas,
                    genericCosmeticFilters, genericHighCosmeticFilters,
                    genericCosmeticExceptions, specificCosmeticFilters,
                    scriptletFilters, dnrRules, responseHeaderRules,
                    context.bareInvalid);
                continue;
            }

            // Malformed hosts-file entries: in uBO, when the parser sees a line
            // that has whitespace, no options anchor ($), and starts with a word-like
            // prefix (matching /^[\w%.:[\]-]+\s+/), it checks the remainder.
            // If the remainder is not a valid hostname, the line is classified as
            // AST_TYPE_NONE (not a filter) and silently ignored.
            // Common case: YAML-style comment continuations like
            //   "    Dutch supplement for the Easylist filters..."
            // which after trim() become "Dutch supplement for..." and match this pattern.
            if (/\s/.test(line) && !line.includes('$') && !line.startsWith('@@')) {
                const hostsSinkMatch = /^[\w%.:[\]\-]+\s+/.exec(line);
                if (hostsSinkMatch) {
                    const remainder = line.slice(hostsSinkMatch[0].length);
                    if (!/^(?:[\da-z][\da-z_.-]*\.)*[\da-z][\da-z-]*[\da-z]$/.test(remainder)) {
                        continue; // Silently ignore malformed hosts entry (matches OLD behavior)
                    }
                }
            }

            // Network filter
            let { exception, pattern, optionsStr } = splitNetworkFilter(line);

            // Bare hostname detection: patterns like "example.com" or "46.8.158.80"
            // that match uBO's reHostnameAscii are converted to ||hostname^
            // Only when there are no options (just a bare hostname line)
            // uBO normalizes patterns to lowercase during parsing
            if (!exception && !optionsStr && reHostnameAscii.test(pattern)) {
                pattern = `||${pattern.toLowerCase()}^`;
                // Re-check badfilter for the normalized form
                if (badFilterTargets.has(normalizeForBadfilter(pattern))) {
                    // In OLD engine: compiles to GOOD (counted), matches BAD (rejected)
                    context.filterCount++;
                    // Use normalized pattern for dedup (bare hostname already → ||hostname^)
                    const dedupKey = normalizeForBadfilter(pattern);
                    if (!context.seenFilterLines.has(dedupKey)) {
                        context.seenFilterLines.add(dedupKey);
                        context.rejectedFilterCount++;
                    }
                    continue;
                }
            }

            const opts = parseNetworkOptions(optionsStr);

            // Skip badfilter directives (go to BAD section in OLD engine, not counted)
            if (opts.badfilter) continue;

            // Compute expansion factor BEFORE any modifications to opts.
            // In the OLD engine, a single filter line can produce multiple compiled
            // entries: just-origin filters produce one per domain, and explicit
            // types produce one per type bit. filterCount counts all entries.
            const expansion = computeFilterExpansion(pattern, opts);
            const typeFactor = computeTypeBitCount(opts);

            // Per-domain badfilter: remove individual domains from multi-domain filters.
            // In uBO, a multi-domain filter $3p,domain=a.com|b.com|c.com is compiled into
            // per-domain atomic entries. A badfilter $3p,domain=a.com,badfilter removes
            // just the a.com entry. Track removed domains for rejectedFilterCount.
            let rejectedByBadfilter = 0;
            if (opts.domains.length > 0 && perDomainBadfilters.size > 0) {
                const key = computeBadfilterKey(normalizeForBadfilter(line));
                if (perDomainBadfilters.has(key)) {
                    const badDomains = perDomainBadfilters.get(key);
                    const beforeCount = opts.domains.filter(d => !d.negated).length;
                    opts.domains = opts.domains.filter(d => {
                        if (d.negated) return true;
                        return !badDomains.has(d.domain.toLowerCase());
                    });
                    const afterCount = opts.domains.filter(d => !d.negated).length;
                    rejectedByBadfilter = (beforeCount - afterCount) * typeFactor;
                    if (afterCount === 0) {
                        // All positive domains removed by per-domain badfilter
                        context.filterCount += expansion;
                        // Use normalized form for dedup key
                        const dedupLine = (exception ? '@@' : '') + pattern + (optionsStr ? '$' + optionsStr : '');
                        const dedupKey = normalizeForBadfilter(dedupLine);
                        if (!context.seenFilterLines.has(dedupKey)) {
                            context.seenFilterLines.add(dedupKey);
                            context.rejectedFilterCount += expansion;
                        }
                        continue;
                    }
                }
            }

            // --- Parser errors: filters that don't compile in OLD engine ---
            // These are NOT counted in filterCount (they don't go to GOOD section).
            // Check all parser error conditions before counting.
            // NOTE: genericblock is NOT checked here — it must come AFTER
            // generichide handling because $genericblock,generichide filters
            // contribute generichide exclusion domains before being rejected.
            let isParserError = false;
            let parserErrorMsg = null;

            if (opts._replace && !trustedSource) {
                isParserError = true;
                parserErrorMsg = `Rejected filter: ${line}`;
            } else if (opts._uritransform && !trustedSource) {
                isParserError = true;
                parserErrorMsg = `Rejected filter: ${line}`;
            } else if (opts._cname && !exception) {
                isParserError = true;
                parserErrorMsg = `Rejected filter: ${line}`;
            } else if (opts._redirectRule) {
                isParserError = true;
                parserErrorMsg = `Incompatible with DNR: ${line}`;
            } else if (opts._unsupported && !opts._silentSkip) {
                // _unsupported is a parser error, but _silentSkip takes precedence
                // (modifier values with commas can set _unsupported as side effect)
                isParserError = true;
                parserErrorMsg = `Rejected filter: ${line}`;
            }

            if (isParserError) {
                if (parserErrorMsg) context.bareInvalid.add(parserErrorMsg);
                continue;
            }

            // Pattern too long: non-regex patterns > 1024 chars cause FILTER_UNSUPPORTED
            const isRegexPattern = pattern.startsWith('/') && pattern.endsWith('/') && pattern.length > 2;
            if (!isRegexPattern && pattern.length > 1024) {
                context.bareInvalid.add(`Invalid network filter in ${currentListName}: ${line}`);
                continue;
            }

            // Syntactically bad domains: wildcards in non-entity position
            // (e.g., "matichon*.com"). uBO's parser sets AST_FLAG_HAS_ERROR,
            // so the filter is NOT counted, but the filter is still processed
            // for DNR rules (bad domains are dropped in convertToDNR).
            const _hasBadDomain = (ds) => ds.some(d =>
                !d.domain.startsWith('/') &&  // regex domains are valid syntax
                d.domain.includes('*') && !d.domain.endsWith('.*'));
            const skipCounting = _hasBadDomain(opts.domains) ||
                _hasBadDomain(opts.toDomains);

            // --- Filter compiles (goes to GOOD in OLD engine) ---
            // Count in filterCount with expansion factor.
            if (!skipCounting) context.filterCount += expansion;

            // Cross-list deduplication: in the OLD engine, compiled entries go
            // into a GOOD Set that deduplicates identical entries across lists.
            // filterCount counts every entry (including duplicates), but
            // acceptedFilterCount and rejectedFilterCount only count unique entries.
            // Line-level dedup catches exact duplicate lines.
            const dedupLine = (exception ? '@@' : '') + pattern + (optionsStr ? '$' + optionsStr : '');
            const dedupKey = normalizeForBadfilter(dedupLine);
            const isDuplicate = context.seenFilterLines.has(dedupKey);
            // Don't add genericblock filters to seen (they're parser errors)
            if (!isDuplicate && !opts.genericblock) {
                context.seenFilterLines.add(dedupKey);
            }
            if (!isDuplicate && !skipCounting) {
                context.rejectedFilterCount += rejectedByBadfilter;
            }
            // Entry-level dedup: the OLD engine's GOOD Set deduplicates at the
            // compiled entry level, not just source line level. Two different filter
            // lines can produce overlapping entries (e.g., ||domain^ shares a
            // typeless entry with ||domain^$all). Count only truly new entries.
            let acceptedExpansion;
            if (isDuplicate || skipCounting) {
                acceptedExpansion = 0;
            } else if (isJustOriginFilter(pattern, opts)) {
                // Just-origin filters: in uBO, each (domain, type) pair is a
                // separate compiled entry keyed by [catBits, tokenHash, domain].
                // Two filters sharing a domain+type produce the same entry and
                // are deduplicated in the GOOD Set.
                // Normalize pattern to token hash category: in uBO, `*`, ``,
                // and `|http*://` all use ANY_TOKEN_HASH; `|https://` uses
                // ANY_HTTPS; `|http://` uses ANY_HTTP.
                let tokenTag;
                if (pattern === '*' || pattern === '' || pattern.startsWith('|http*')) {
                    tokenTag = 'ANY';
                } else if (pattern.startsWith('|https')) {
                    tokenTag = 'HTTPS';
                } else {
                    tokenTag = 'HTTP';
                }
                const baseKey = (exception ? '@@' : '') + tokenTag + '\t' +
                    (opts.firstParty && opts.thirdParty ? 'any'
                        : opts.firstParty ? '1p'
                        : opts.thirdParty ? '3p' : 'any');
                const typeLabels = computeEntryTypeLabels(opts);
                let newEntryCount = 0;
                for (const label of typeLabels) {
                    for (const d of opts.domains) {
                        if (d.negated) continue;
                        const entryKey = baseKey + '\tD' + d.domain + '\t' + label;
                        if (!context.seenEntries.has(entryKey)) {
                            context.seenEntries.add(entryKey);
                            newEntryCount++;
                        }
                    }
                }
                acceptedExpansion = newEntryCount;
            } else {
                const baseKey = computeEntryBaseKey(exception, pattern, opts);
                const typeLabels = computeEntryTypeLabels(opts);
                let newEntryCount = 0;
                for (const label of typeLabels) {
                    const entryKey = baseKey + '\t' + label;
                    if (!context.seenEntries.has(entryKey)) {
                        context.seenEntries.add(entryKey);
                        newEntryCount++;
                    }
                }
                acceptedExpansion = newEntryCount;
            }

            // $replace (trusted): compiled but no DNR output
            if (opts._replace) {
                context.acceptedFilterCount += acceptedExpansion;
                continue;
            }

            // $uritransform (trusted): compiled, produces rule-level error
            if (opts._uritransform) {
                context.acceptedFilterCount += acceptedExpansion;
                const rule = {
                    action: { type: 'block' },
                    condition: {},
                    _error: [`Incompatible with DNR: uritransform=${opts._uritransformValue}`],
                };
                dnrRules.push(rule);
                continue;
            }

            // $cname (exception): compiled but no DNR output
            if (opts._cname) {
                context.acceptedFilterCount += acceptedExpansion;
                continue;
            }

            // Silent skip: options that compile in uBO but produce no output.
            // E.g. $header=value, $inline-script only.
            if (opts._silentSkip) {
                context.acceptedFilterCount += acceptedExpansion;
                continue;
            }

            // Handle generichide/elemhide/specifichide
            // Non-exception: $ghide/$elemhide on block filters creates only a
            // cosmetic filter suppression entry in uBO, no network DNR rule.
            // $shide/$specifichide on either block or exception also creates
            // only a cosmetic filter suppression entry with no network rule.
            if (!exception && (opts.generichide || opts.elemhide || opts.specifichide)) {
                if (opts.types.length === 0 && opts.negatedTypes.length === 0 && !opts.all) {
                    context.acceptedFilterCount += acceptedExpansion;
                    continue; // No network types — cosmetic suppression only
                }
                // Has network types too — fall through (clear the non-network flags)
                opts.generichide = false;
                opts.elemhide = false;
                opts.specifichide = false;
            }
            if (opts.specifichide) {
                // $specifichide on exceptions: cosmetic-only, no DNR rule
                if (opts.types.length === 0 && opts.negatedTypes.length === 0 && !opts.all) {
                    context.acceptedFilterCount += acceptedExpansion;
                    continue;
                }
                opts.specifichide = false;
            }
            if (exception && (opts.generichide || opts.elemhide)) {
                // Collect generichide exclusion domains. In uBO, exclusions
                // are collected from the ALLOW|ANYPARTY|generichide bucket,
                // so only anyparty filters contribute (no 1p/3p specific).
                // The collection checks initiatorDomains first; if none,
                // falls back to requestDomains. requestDomains includes
                // both to= domains AND the pattern hostname (for pure
                // hostname patterns like ||hostname^, via FilterAnchorHn).
                if (!opts.firstParty && !opts.thirdParty) {
                    // Check initiatorDomains (from domain=/from=)
                    const ghFromDomains = [];
                    for (const d of opts.domains) {
                        if (!d.negated) ghFromDomains.push(d.domain);
                    }
                    if (ghFromDomains.length > 0) {
                        for (const d of ghFromDomains) {
                            context.generichideExclusions.push(d);
                        }
                    } else {
                        // Use requestDomains: to= domains + pattern hostname.
                        // In uBO, FilterAnchorHn converts pure hostname patterns
                        // to requestDomains before to= domains are appended.
                        // The uBO parser classifies a pattern as hostname if it
                        // matches reHostnameAscii (with or without trailing ^).
                        const reHostnameAscii = /^(?:[\da-z][\da-z_-]*\.)*[\da-z][\da-z-]*[\da-z]$/;
                        let domain = pattern;
                        if (domain.startsWith('||')) domain = domain.slice(2);
                        if (domain.endsWith('^')) domain = domain.slice(0, -1);
                        if (domain && reHostnameAscii.test(domain)) {
                            context.generichideExclusions.push(toPunycode(domain));
                        }
                        for (const d of opts.toDomains) {
                            if (!d.negated) context.generichideExclusions.push(d.domain);
                        }
                    }
                }
                // If there are also network types (e.g., $elemhide,subdocument),
                // remove the non-network types and continue to create a DNR rule
                // for the remaining types. In uBO, compileToAtomicFilter creates
                // per-type entries: elemhide goes to generichide bucket, sub_frame
                // gets a real DNR rule.
                opts.generichide = false;
                opts.elemhide = false;
                if (opts.types.length === 0 && opts.negatedTypes.length === 0 && !opts.all) {
                    context.acceptedFilterCount += acceptedExpansion;
                    continue;
                }
                // Fall through to create DNR rule for the remaining network types
            }

            // Skip genericblock filters — deprecated/unsupported in MV3.
            // In uBO, compiler.compile() returns FILTER_UNSUPPORTED for genericblock,
            // producing an "Invalid network filter" bare error via compiler.error.
            // This check is placed AFTER generichide handling because
            // $genericblock,generichide filters contribute generichide exclusion
            // domains before being rejected.
            if (opts.genericblock) {
                // Undo filterCount since this is a parser error
                context.filterCount -= expansion;
                if (!isDuplicate) {
                    context.rejectedFilterCount -= rejectedByBadfilter;
                }
                context.bareInvalid.add(`Invalid network filter in ${currentListName}: ${line}`);
                continue;
            }

            // Skip popup/popunder-only filters (not supported in DNR, but compiled in OLD engine)
            // A filter with only popup and/or popunder types has no DNR-representable types.
            if ((opts.popup || opts._popunder) && !opts.types.length && !opts.all) {
                context.acceptedFilterCount += acceptedExpansion;
                continue;
            }

            // Skip DNR generation for cross-list duplicates
            // (first occurrence already generated the rule)
            if (isDuplicate) {
                continue;
            }

            // DOT_TOKEN_HASH: bare hostname with no option units → requestDomains
            // In uBO, when isPureHostname && hasNoOptionUnits(), the hostname goes
            // directly into a requestDomains array (DOT_TOKEN_HASH bucket).
            // Party bits, positive types, matchCase, popup do NOT count as option units.
            // isPureHostname is true when: pattern without | anchors (NOT ^) passes reHostnameAscii.
            // Note: ^ is a separator, not an anchor — patterns like "hostname.com^$type"
            // do NOT get isPureHostname because ^ stays in the pattern during the check.
            // This handles: hostname.com$3p, hostname.com|$image, @@hostname.com, etc.
            if (!pattern.startsWith('||') && !hasOptionUnits(opts)) {
                let clean = pattern;
                if (clean.startsWith('|')) clean = clean.slice(1);
                if (clean.endsWith('|')) clean = clean.slice(0, -1);
                if (reHostnameAscii.test(clean)) {
                    pattern = `||${clean.toLowerCase()}^`;
                }
            }

            const rule = networkFilterToDNR(pattern, opts, exception, extensionPaths);
            if (rule === null) {
                // $important block rules or whitespace patterns — compiled but no rule
                context.acceptedFilterCount += acceptedExpansion;
                continue;
            }

            // $strict1p/$strict3p: uBO compiles these fully but marks them
            // as errors via FilterStrictParty.dnrFromCompiled. The rule has
            // a real condition/action but can't be used in DNR.
            if (opts._strictParty) {
                const partyness = opts._strictParty === 'strict1p' ? '1' : '3';
                rule._error = rule._error || [];
                rule._error.push(`FilterStrictParty: Strict partyness strict${partyness}p not supported`);
            }

            if (rule._error) {
                for (const err of rule._error) {
                    context.invalid.add(err);
                }
            }
            dnrRules.push(rule);

            // In uBO, main_frame is a non-network type (type offset 14, beyond
            // the network range 1-11). When $all is used, compileToAtomicFilter
            // creates a typeless entry (for all network types) PLUS separate
            // per-type entries for non-network types including main_frame.
            // Duplicate the domain into a main_frame entry so it merges correctly.
            if (opts.all && !rule._error && !rule.condition.regexFilter) {
                const dupCondition = { ...rule.condition, resourceTypes: ['main_frame'] };
                // Remove excludedResourceTypes from the duplicate (main_frame entry
                // should have explicit resourceTypes:['main_frame'] only)
                delete dupCondition.excludedResourceTypes;
                // DOT_TOKEN_HASH path: requestDomains-only, no urlFilter.
                // Only create the duplicate when the filter has NO option units
                // (hasNoOptionUnits() in uBO). Filters with option units
                // (FROM_BIT, NOT_TYPE_BIT, etc.) are EMPTY_TOKEN_HASH in uBO;
                // their main_frame entries are absorbed by mergeRules(resourceTypes)
                // into the typeless entry. Creating a duplicate here would cause
                // incorrect pre-merge into the DOT_TOKEN_HASH main_frame group.
                const hasNoOptionUnits =
                    opts.domains.length === 0 &&
                    opts.toDomains.length === 0 &&
                    opts.negatedTypes.length === 0 &&
                    !opts._hasNonDnrNegatedType &&
                    opts.denyallow.length === 0 &&
                    !opts.important &&
                    opts.methods.length === 0 &&
                    opts.negatedMethods.length === 0;
                if (hasNoOptionUnits && rule.condition.requestDomains && !rule.condition.urlFilter) {
                    dupCondition.requestDomains = [...rule.condition.requestDomains];
                    dnrRules.push({
                        action: { ...rule.action },
                        condition: dupCondition,
                        ...(rule.priority !== undefined ? { priority: rule.priority } : {}),
                    });
                // ANY_TOKEN_HASH path: initiatorDomains-only, isJustOrigin url.
                // This path already implies isJustOrigin (optionUnitBits === FROM_BIT)
                // since initiatorDomains is only present when valid domains exist,
                // and these filters are ANY_TOKEN_HASH in uBO which pre-merges.
                } else if (rule.condition.initiatorDomains && !rule.condition.requestDomains &&
                    (!rule.condition.urlFilter || rule.condition.urlFilter === '|https://' || rule.condition.urlFilter === '|http://')) {
                    dupCondition.initiatorDomains = [...rule.condition.initiatorDomains];
                    dnrRules.push({
                        action: { ...rule.action },
                        condition: dupCondition,
                        ...(rule.priority !== undefined ? { priority: rule.priority } : {}),
                    });
                } else if (!rule.condition.excludedResourceTypes) {
                    // EMPTY path: urlFilter-based $all filters that are neither
                    // DOT (requestDomains-only) nor ANY (initiatorDomains-only).
                    // Examples: ||*ontent.steamplay.*^$all, ||host^$all,important
                    // In uBO, compileToAtomicFilter creates main_frame entries for
                    // ALL $all filters. The duplicate may get merged away by
                    // finalizeRuleset's mergeRules(resourceTypes), but its presence
                    // during sorting establishes the correct category ordering
                    // (EMPTY before DOT) in the main_frame type group.
                    // Only create when the original rule does NOT have
                    // excludedResourceTypes (which includes 'main_frame' for
                    // ~inline-font and other negated non-DNR types). When
                    // excludedResourceTypes includes main_frame, the typeless rule
                    // already excludes main_frame, and no separate main_frame
                    // entry exists in uBO's output.
                    // Copy _hadFromBit to prevent DOT pre-merge from incorrectly
                    // absorbing this EMPTY duplicate into DOT main_frame groups
                    // (e.g., ||host^$all,domain=~entity.* where entity is dropped).
                    dnrRules.push({
                        action: { ...rule.action },
                        condition: dupCondition,
                        ...(rule.priority !== undefined ? { priority: rule.priority } : {}),
                        ...(rule._hadFromBit ? { _hadFromBit: true } : {}),
                    });
                }
            }

            context.acceptedFilterCount += acceptedExpansion;
        }
    }

    // Per-type splitting for ALL multi-type rules.
    // In uBO, compileToAtomicFilter writes one entry PER type bit for all
    // multi-type filters (not just DOT/ANY). Each entry goes into its
    // respective type bucket. finalizeRuleset's mergeRules(resourceTypes)
    // later re-merges compatible rules. Without this split, multi-type
    // EMPTY rules (e.g., `.xyz:9002/*?x=$websocket,script,3p`) sort into
    // the wrong type group, breaking category ordering within type buckets.
    {
        const expanded = [];
        for (let i = 0; i < dnrRules.length; i++) {
            const rule = dnrRules[i];
            const rt = rule.condition.resourceTypes;
            // In uBO, compileToAtomicFilter creates per-type entries for all
            // multi-type filters. However, modifier rules (removeparam, csp,
            // permissions) get their default types added AFTER the per-type
            // iteration, keeping them at their original type-bucket position.
            // If we split modifier rules, the typeless ones (which get default
            // types) would end up in type groups instead of no_type, causing
            // incorrect ordering. So only split block/allow rules.
            // Error rules are also split: in uBO, even filters that produce
            // unsupported rules (e.g., entity-only domain filters) create
            // per-type compiled entries that establish bucket ordering.
            // Without splitting, multi-type error rules go into the wrong
            // type group (based on minType), breaking category ordering.
            const isBlockAllow = rule.action.type === 'block' || rule.action.type === 'allow';
            const needsSplit = isBlockAllow && rt && rt.length > 1;
            if (needsSplit) {
                for (const type of rt) {
                    const entry = {
                        action: rule.action,
                        condition: { ...rule.condition, resourceTypes: [type] },
                        ...(rule.priority !== undefined ? { priority: rule.priority } : {}),
                        ...(rule._hadFromBit ? { _hadFromBit: true } : {}),
                        ...(rule._error ? { _error: rule._error } : {}),
                    };
                    // Carry over _justOriginMergeKey with per-type adjustment.
                    // The original key has combined types (e.g., "block|3p|any|script,sub_frame").
                    // Each per-type entry needs its own key with just its type.
                    // In uBO, per-type compiled entries go into separate buckets,
                    // so each type is absorbed independently.
                    if (rule._justOriginMergeKey) {
                        const parts = rule._justOriginMergeKey.split('|');
                        parts[3] = type;
                        entry._justOriginMergeKey = parts.join('|');
                    }
                    expanded.push(entry);
                }
            } else {
                expanded.push(rule);
            }
        }
        dnrRules.length = 0;
        for (let j = 0; j < expanded.length; j++) {
            dnrRules.push(expanded[j]);
        }
    }

    // Pre-merge requestDomains-only rules within each type group (in-place).
    // In uBO's toRuleset, DOT_TOKEN_HASH entries are grouped by
    // (catBits, type) and their hostnames merged into a single
    // requestDomains rule BEFORE finalizeRuleset's merge pipeline.
    // Without this, mergeRules(resourceTypes) incorrectly absorbs
    // typed requestDomains rules into typeless ones when they share
    // the same domain (e.g., ||domain^ + ||domain^$document).
    // We do this in-place: first occurrence of each group keeps its
    // position and accumulates domains; later occurrences are removed.
    {
        const groupMap = new Map(); // key → { idx, domains }
        const toRemove = new Set();
        for (let i = 0; i < dnrRules.length; i++) {
            const rule = dnrRules[i];
            if (rule._error) continue; // Skip error rules
            // Only match DOT_TOKEN_HASH rules: requestDomains-only, no other
            // option units (no initiatorDomains, no excludedDomains, no urlFilter).
            // Rules with both requestDomains AND initiatorDomains (e.g., ||host^$domain=...)
            // are EMPTY_TOKEN_HASH entries that must NOT be pre-merged here.
            // Modifier rules (redirect, modifyHeaders) have MODIFY_BIT which
            // prevents DOT_TOKEN_HASH classification in uBO.
            // FROM_BIT (domain= option) prevents DOT_TOKEN_HASH in uBO, even
            // after entity domain removal clears initiatorDomains. These rules
            // remain EMPTY_TOKEN_HASH and must NOT be pre-merged as DOT.
            if (rule.condition.requestDomains &&
                !rule.condition.urlFilter &&
                !rule.condition.regexFilter &&
                !rule.condition.initiatorDomains &&
                !rule.condition.excludedInitiatorDomains &&
                !rule.condition.excludedRequestDomains &&
                !rule._hadFromBit &&
                (rule.action.type === 'block' || rule.action.type === 'allow')) {
                const keyObj = {
                    action: rule.action,
                    condition: { ...rule.condition },
                };
                delete keyObj.condition.requestDomains;
                if (rule.priority !== undefined) keyObj.priority = rule.priority;
                const key = JSON.stringify(keyObj);
                if (!groupMap.has(key)) {
                    groupMap.set(key, { idx: i, domains: new Set(rule.condition.requestDomains) });
                } else {
                    const entry = groupMap.get(key);
                    for (const d of rule.condition.requestDomains) {
                        entry.domains.add(d);
                    }
                    toRemove.add(i);
                }
            }
        }
        // Update the first rule in each group with merged domains
        for (const { idx, domains } of groupMap.values()) {
            dnrRules[idx].condition.requestDomains = [...domains].sort();
        }
        // Remove absorbed rules (iterate in reverse to maintain indices)
        if (toRemove.size > 0) {
            const kept = [];
            for (let i = 0; i < dnrRules.length; i++) {
                if (!toRemove.has(i)) kept.push(dnrRules[i]);
            }
            dnrRules.length = 0;
            for (const r of kept) dnrRules.push(r);
        }
    }

    // Pre-merge initiatorDomains-only rules within each type group (in-place).
    // In uBO's toRuleset, ANY_TOKEN_HASH/ANY_HTTPS/ANY_HTTP entries are
    // grouped by (catBits, type) and their domains merged into a single
    // initiatorDomains rule BEFORE finalizeRuleset's merge pipeline.
    // This ensures the merge pipeline sees ONE rule per (type, action, party)
    // with all domains combined, matching uBO's per-type bucket accumulation.
    {
        const isJustOriginUrl = uf => !uf || uf === '|https://' || uf === '|http://';
        const groupMap = new Map(); // key → { idx, domains }
        const toRemove = new Set();
        for (let i = 0; i < dnrRules.length; i++) {
            const rule = dnrRules[i];
            if (rule._error) continue;
            // Only match ANY_TOKEN_HASH / ANY_HTTPS / ANY_HTTP rules:
            // initiatorDomains-only (isJustOrigin), no other option units.
            // Modifier rules (redirect, modifyHeaders) are EMPTY_TOKEN_HASH
            // entries in uBO and must NOT be pre-merged.
            if (rule.condition.initiatorDomains &&
                !rule.condition.requestDomains &&
                isJustOriginUrl(rule.condition.urlFilter) &&
                !rule.condition.regexFilter &&
                !rule.condition.excludedInitiatorDomains &&
                !rule.condition.excludedRequestDomains &&
                (rule.action.type === 'block' || rule.action.type === 'allow')) {
                const keyObj = {
                    action: rule.action,
                    condition: { ...rule.condition },
                };
                delete keyObj.condition.initiatorDomains;
                if (rule.priority !== undefined) keyObj.priority = rule.priority;
                const key = JSON.stringify(keyObj);
                if (!groupMap.has(key)) {
                    groupMap.set(key, { idx: i, domains: new Set(rule.condition.initiatorDomains) });
                } else {
                    const entry = groupMap.get(key);
                    for (const d of rule.condition.initiatorDomains) {
                        entry.domains.add(d);
                    }
                    // Transfer _justOriginMergeKey from absorbed rules, like
                    // mergeRules Fix 3. A rule in the group may lack the key
                    // (e.g., ~popup makes computeJustOriginKey return null)
                    // while other rules in the same group have it.
                    if (rule._justOriginMergeKey && !dnrRules[entry.idx]._justOriginMergeKey) {
                        dnrRules[entry.idx]._justOriginMergeKey = rule._justOriginMergeKey;
                    }
                    toRemove.add(i);
                }
            }
        }
        for (const { idx, domains } of groupMap.values()) {
            dnrRules[idx].condition.initiatorDomains = [...domains].sort();
        }
        if (toRemove.size > 0) {
            const kept = [];
            for (let i = 0; i < dnrRules.length; i++) {
                if (!toRemove.has(i)) kept.push(dnrRules[i]);
            }
            dnrRules.length = 0;
            for (const r of kept) dnrRules.push(r);
        }
    }

    // Sort rules to match uBO's realm-based iteration order:
    // realm (block → allow → redirect → modifyHeaders)
    // → partyness (any → firstParty → thirdParty)
    // → type (no_type → stylesheet → image → ... → main_frame)
    // → token hash category (DOT/ANY/EMPTY, grouped by first-occurrence within group)
    // uBO iterates realms: BLOCK → ALLOW → REDIRECT → REMOVEPARAM → CSP → PERMISSIONS
    // Both redirect-rule and removeparam produce action.type='redirect' in DNR,
    // and both csp and permissions produce action.type='modifyHeaders'.
    // Use a function to distinguish sub-realms.
    const getRealmOrder = (rule) => {
        switch (rule.action.type) {
            case 'block': return 0;
            case 'allow': return 1;
            case 'redirect':
                // redirect-rule (extensionPath) vs removeparam (transform/queryTransform)
                return rule.action.redirect?.extensionPath !== undefined ? 2 : 3;
            case 'modifyHeaders':
                // CSP (content-security-policy) vs permissions (permissions-policy)
                if (rule.action.responseHeaders?.[0]?.header === 'permissions-policy') return 5;
                return 4;
            default: return 9;
        }
    };
    const domainTypeOrder = { undefined: 0, 'firstParty': 1, 'thirdParty': 2 };
    const typeOrder = {
        'stylesheet': 1, 'image': 2, 'object': 3, 'script': 4,
        'xmlhttprequest': 5, 'sub_frame': 6, 'font': 7, 'media': 8,
        'websocket': 9, 'ping': 10, 'other': 11, 'main_frame': 12,
    };

    // Classify each rule into a "token hash category" matching uBO's bucket grouping:
    // DOT = requestDomains-only (DOT_TOKEN_HASH): isPureHostname && hasNoOptionUnits
    // ANY = initiatorDomains-only (ANY_TOKEN_HASH): empty pattern with domain= only
    // ANY_HTTPS/ANY_HTTP = scheme + initiatorDomains, EMPTY = everything else
    // Option units include: domain= (initiatorDomains), to= (requestDomains from to=),
    // denyallow (excludedRequestDomains), redirect, csp, etc.
    // Party bits, positive types, matchCase, popup do NOT count as option units.
    const getTokenCategory = (rule) => {
        const c = rule.condition;
        // Option unit indicators that prevent DOT_TOKEN_HASH / ANY_TOKEN_HASH:
        // NOT_TYPE_BIT → excludedResourceTypes
        // METHOD_BIT → requestMethods / excludedRequestMethods
        // IMPORTANT_BIT → priority
        // DENYALLOW_BIT → excludedRequestDomains
        // FROM_BIT → initiatorDomains / excludedInitiatorDomains
        // MODIFY_BIT → redirect/modifyHeaders (modifier rules are always EMPTY_TOKEN_HASH)
        // Use _isModifier flag (set during parsing) in addition to action.type check,
        // because error rules may have incorrect action.type (e.g., redirect-rule errors
        // keep action.type='block' but ARE modifiers in uBO's compilation).
        const isModifier = rule._isModifier || rule.action.type === 'redirect' || rule.action.type === 'modifyHeaders';
        if (isModifier) return 'EMPTY';
        const hasExtraOptionUnits =
            c.excludedResourceTypes ||
            c.requestMethods || c.excludedRequestMethods ||
            c.excludedRequestDomains ||
            rule.priority !== undefined;
        // DOT: requestDomains present with NO option units.
        // isPureHostname && hasNoOptionUnits() in uBO.
        // FROM_BIT (domain= option) prevents DOT even after entity domain removal.
        if (c.requestDomains && !c.urlFilter && !c.regexFilter &&
            !c.initiatorDomains && !c.excludedInitiatorDomains &&
            !rule._hadFromBit &&
            !hasExtraOptionUnits) return 'DOT';
        // ANY: isJustOrigin in uBO — optionUnitBits === FROM_BIT
        // (only FROM_BIT, no other option units) AND pattern is * or scheme.
        // Must have initiatorDomains (non-negated FROM_BIT).
        if (c.initiatorDomains && !c.requestDomains &&
            !c.excludedInitiatorDomains && !hasExtraOptionUnits) {
            if (!c.urlFilter && !c.regexFilter) return 'ANY';
            if (c.urlFilter === '|https://') return 'ANY_HTTPS';
            if (c.urlFilter === '|http://') return 'ANY_HTTP';
        }
        // Entity-domain-only error rules: all positive domains were entity
        // (e.g., domain=mylink.*|my1ink.*) and removed during parsing.
        // In uBO, these filters are still compiled with ANY_TOKEN_HASH
        // (isJustOrigin: pattern is * or scheme, optionUnitBits === FROM_BIT).
        // Their compiled entries establish bucket ordering even though the
        // resulting rules are later discarded. Classify them as ANY/ANY_HTTPS/
        // ANY_HTTP so they establish correct category ordering during sorting.
        if (rule._error && rule._hadFromBit && !c.initiatorDomains &&
            !c.requestDomains && !hasExtraOptionUnits) {
            if (!c.urlFilter && !c.regexFilter) return 'ANY';
            if (c.urlFilter === '|https://') return 'ANY_HTTPS';
            if (c.urlFilter === '|http://') return 'ANY_HTTP';
        }
        return 'EMPTY';
    };

    // Assign original index and group key to each rule
    for (let i = 0; i < dnrRules.length; i++) {
        dnrRules[i]._origIdx = i;
    }

    // Only treat positive resourceTypes as "typed" for sorting.
    // excludedResourceTypes rules appear in the no_type group in the OLD build.
    const getTypeGroup = (rule) => {
        if (rule.condition.resourceTypes) return 1; // typed
        return 0; // no_type (includes excludedResourceTypes rules)
    };

    // Compute the group key for each rule
    const getGroupKey = (rule) => {
        const realm = getRealmOrder(rule);
        const party = domainTypeOrder[rule.condition.domainType] ?? 0;
        const typeG = getTypeGroup(rule);
        let minType = 0;
        if (typeG === 1) {
            const types = rule.condition.resourceTypes || [];
            minType = types.length > 0 ? Math.min(...types.map(t => typeOrder[t] ?? 99)) : 99;
        }
        return `${realm}|${party}|${typeG}|${minType}`;
    };

    // For each group, find the minimum original index for each token category.
    // This determines the category ordering within each group (matches uBO's Map insertion order).
    // For each group, find the minimum original index for each token category
    // This determines the category ordering within each group (matches uBO's Map insertion order)
    const groupCategoryFirstIdx = new Map();
    for (const rule of dnrRules) {
        const groupKey = getGroupKey(rule);
        const cat = getTokenCategory(rule);
        const key = `${groupKey}|${cat}`;
        if (!groupCategoryFirstIdx.has(key)) {
            groupCategoryFirstIdx.set(key, rule._origIdx);
        }
    }
    dnrRules.sort((a, b) => {
        // By realm (action type)
        const realmA = getRealmOrder(a);
        const realmB = getRealmOrder(b);
        if (realmA !== realmB) return realmA - realmB;

        // By domainType (partyness): any → firstParty → thirdParty
        const dtA = domainTypeOrder[a.condition.domainType] ?? 0;
        const dtB = domainTypeOrder[b.condition.domainType] ?? 0;
        if (dtA !== dtB) return dtA - dtB;

        // no_type before typed (excludedResourceTypes counts as no_type)
        const typeGA = getTypeGroup(a);
        const typeGB = getTypeGroup(b);
        if (typeGA !== typeGB) return typeGA - typeGB;

        // Within typed: sort by minimum resource type order value
        if (typeGA === 1 && typeGB === 1) {
            const typesA = a.condition.resourceTypes || [];
            const typesB = b.condition.resourceTypes || [];
            const minTypeA = typesA.length > 0 ? Math.min(...typesA.map(t => typeOrder[t] ?? 99)) : 99;
            const minTypeB = typesB.length > 0 ? Math.min(...typesB.map(t => typeOrder[t] ?? 99)) : 99;
            if (minTypeA !== minTypeB) return minTypeA - minTypeB;
        }

        // Within same group: sort by token hash category (grouped by first-occurrence)
        const catA = getTokenCategory(a);
        const catB = getTokenCategory(b);
        if (catA !== catB) {
            const groupKey = getGroupKey(a); // same group for a and b
            const firstA = groupCategoryFirstIdx.get(`${groupKey}|${catA}`);
            const firstB = groupCategoryFirstIdx.get(`${groupKey}|${catB}`);
            if (firstA !== firstB) return firstA - firstB;
        }

        // Within same category: maintain original (filter-list) order
        return a._origIdx - b._origIdx;
    });

    // Apply deferred default types for modifier rules (removeparam, csp,
    // permissions). These were delayed to keep the rules in the no_type group
    // during sorting, matching uBO's behavior where modifier post-processing
    // adds default types AFTER the per-type iteration.
    for (const rule of dnrRules) {
        if (rule._defaultTypes) {
            rule.condition.resourceTypes = rule._defaultTypes;
        }
    }

    // Clean up temporary properties
    for (const rule of dnrRules) {
        delete rule._origIdx;
        delete rule._hadFromBit;
        delete rule._defaultTypes;
        delete rule._isModifier;
    }

    // Append response header rules (##^responseheader) AFTER all network rules.
    // In uBO, these are collected separately in context.responseHeaderRules and
    // appended after dnrFromCompiled('end') but before finalizeRuleset.
    for (const rule of responseHeaderRules) {
        dnrRules.push(rule);
    }

    // Finalize and merge rules
    const finalRules = finalizeRuleset(dnrRules, context.invalid, context.bareInvalid);

    return {
        network: {
            ruleset: finalRules,
            filterCount: context.filterCount,
            acceptedFilterCount: context.acceptedFilterCount,
            rejectedFilterCount: context.rejectedFilterCount,
            generichideExclusions: Array.from(new Set(context.generichideExclusions)),
        },
        genericCosmetic: genericCosmeticFilters,
        genericHighCosmetic: genericHighCosmeticFilters,
        genericCosmeticExceptions: genericCosmeticExceptions,
        specificCosmetic: specificCosmeticFilters,
        scriptlet: scriptletFilters,
    };
}

function processExtendedFilter(ext, originalLine, trustedSource, nativeCssHas,
    genericCosmeticFilters, genericHighCosmeticFilters,
    genericCosmeticExceptions, specificCosmeticFilters,
    scriptletFilters, dnrRules, responseHeaderRules, bareInvalid) {

    const { left, right, exception, type } = ext;

    // AdGuard scriptlet: #%#//scriptlet('name', 'arg1', 'arg2')
    if (type === 'adguard') {
        const adgMatch = /^\/\/scriptlet\((.+)\)$/.exec(right);
        if (!adgMatch) return;
        if (!left) return;
        if (exception) {
            // Validate domain before skipping: in uBO, invalid hostnames cause
            // parser.hasError() which produces a bare error before this point.
            const domains = parseDomainList(left);
            if (!domains && bareInvalid) bareInvalid.add(`Rejected filter: ${originalLine}`);
            return;
        }

        // Parse AdGuard scriptlet args (quoted, comma-separated)
        const argsStr = adgMatch[1];
        const adgArgs = parseAdGuardScriptletArgs(argsStr);
        if (!adgArgs || adgArgs.length === 0) return;

        // Convert AdGuard scriptlet name to uBO name
        const uboName = convertAdGuardScriptletName(adgArgs[0]);
        if (!uboName) return;

        const args = [uboName, ...adgArgs.slice(1)];
        const argsToken = JSON.stringify(args);
        const domains = parseDomainList(left);
        if (!domains) {
            if (bareInvalid) bareInvalid.add(`Rejected filter: ${originalLine}`);
            return;
        }

        let details = scriptletFilters.get(argsToken);
        if (details === undefined) {
            scriptletFilters.set(argsToken, details = { args });
        }

        for (const { hn, not, bad } of domains) {
            if (bad) continue;
            if (not) {
                if (details.excludeMatches === undefined) {
                    details.excludeMatches = [];
                }
                details.excludeMatches.push(hn);
                continue;
            }
            if (details.matches === undefined) {
                details.matches = [];
            }
            if (details.matches.includes('*')) continue;
            details.matches.push(hn);
        }
        return;
    }

    // Scriptlet injection: ##+js(name, args)
    if (type === 'cosmetic' && right.startsWith('+js(') && right.endsWith(')')) {
        if (!left) return; // Scriptlets require domain
        if (exception) {
            // Validate domain before skipping: in uBO, invalid hostnames cause
            // parser.hasError() which produces a bare error before this point.
            const domains = parseDomainList(left);
            if (!domains && bareInvalid) bareInvalid.add(`Rejected filter: ${originalLine}`);
            return;
        }

        const args = parseScriptletArgs(right);
        if (!args || args.length === 0) return;

        const argsToken = JSON.stringify(args);
        const domains = parseDomainList(left);
        if (!domains) {
            if (bareInvalid) bareInvalid.add(`Rejected filter: ${originalLine}`);
            return;
        }

        let details = scriptletFilters.get(argsToken);
        if (details === undefined) {
            scriptletFilters.set(argsToken, details = { args });
            if (trustedSource) {
                details.trustedSource = true;
            }
        }

        for (const { hn, not, bad } of domains) {
            if (bad) continue;
            if (not) {
                if (details.excludeMatches === undefined) {
                    details.excludeMatches = [];
                }
                details.excludeMatches.push(hn);
                continue;
            }
            if (details.matches === undefined) {
                details.matches = [];
            }
            if (details.matches.includes('*')) continue;
            if (hn === '*') {
                details.matches = ['*'];
                continue;
            }
            details.matches.push(hn);
        }
        return;
    }

    // Response header filter: ##^responseheader(header-name)
    if (type === 'cosmetic' && right.startsWith('^responseheader(')) {
        if (exception) {
            if (left && left.length > 0) {
                const domains = parseDomainList(left);
                if (!domains && bareInvalid) bareInvalid.add(`Rejected filter: ${originalLine}`);
            }
            return;
        }
        if (!left || left.length === 0) return;
        const match = /^\^responseheader\((.+)\)$/.exec(right);
        if (!match) return;
        const header = match[1];
        const rule = {
            action: {
                responseHeaders: [{
                    header,
                    operation: 'remove',
                }],
                type: 'modifyHeaders',
            },
            condition: {
                resourceTypes: ['main_frame', 'sub_frame'],
            },
        };
        const domains = parseDomainList(left);
        if (!domains) {
            if (bareInvalid) bareInvalid.add(`Rejected filter: ${originalLine}`);
            return;
        }
        for (const { hn, not, bad } of domains) {
            if (bad) continue;
            if (not) {
                if (!rule.condition.excludedInitiatorDomains) {
                    rule.condition.excludedInitiatorDomains = [];
                }
                rule.condition.excludedInitiatorDomains.push(hn);
                continue;
            }
            if (hn === '*') continue;
            if (!rule.condition.initiatorDomains) {
                rule.condition.initiatorDomains = [];
            }
            rule.condition.initiatorDomains.push(hn);
        }
        responseHeaderRules.push(rule);
        return;
    }

    // HTML filter: ##^ — In MV3, convert to procedural cosmetic filter
    // (strip the ^ prefix and process as regular cosmetic)
    if (type === 'cosmetic' && right.startsWith('^')) {
        const stripped = right.slice(1);
        if (!stripped) return;

        const hasOptions = left && left.length > 0;
        const compiled = compileSelector(stripped, nativeCssHas);

        if (!hasOptions) {
            // Generic — skip if not procedural
            if (!compiled || compiled.length <= 1) return;
            if (typeof compiled !== 'string' || compiled.charCodeAt(0) !== 0x7B) return;
            genericHighCosmeticFilters.add(stripRawField(compiled));
            return;
        }

        if (!compiled) {
            if (bareInvalid) bareInvalid.add(`Rejected filter: ${originalLine}`);
            return;
        }
        const domains = parseDomainList(left);
        if (!domains) {
            if (bareInvalid) bareInvalid.add(`Rejected filter: ${originalLine}`);
            return;
        }
        addSpecificCosmetic(specificCosmeticFilters, compiled, domains, exception);
        return;
    }

    // Inline CSS: #$# or #@$# or #$?# or #@$?#
    // Translate Adguard CSS injection syntax: selector {style} → pseudo-class form
    // then compile through compileSelector (handles procedural operators, actions, etc.)
    if (type === 'css') {
        if (exception) {
            // Validate domain before skipping: in uBO, invalid hostnames cause
            // parser.hasError() which produces a bare error before this point.
            if (left && left.length > 0) {
                const domains = parseDomainList(left);
                if (!domains && bareInvalid) bareInvalid.add(`Rejected filter: ${originalLine}`);
            }
            return;
        }

        const braceIdx = right.lastIndexOf('{');
        if (braceIdx === -1) {
            // No CSS braces — likely an Adguard snippet filter (e.g., #$#abort-on-property-write).
            // In uBO, these are rejected at the parser level producing a bare "Rejected filter" error.
            if (bareInvalid) bareInvalid.add(`Rejected filter: ${originalLine}`);
            return;
        }

        let cssSel = right.slice(0, braceIdx).trim();
        let style = right.slice(braceIdx + 1);
        if (style.endsWith('}')) style = style.slice(0, -1);
        style = style.trim();
        if (!cssSel || !style) return;

        // Transform like uBO's translateAdguardCSSInjectionFilter
        if (/^\s*remove:\s*true[; ]*$/.test(style)) {
            // {remove:true} → :remove()
            cssSel = cssSel + ':remove()';
        } else if (/^\s*display\s*:\s*none\s*!important\s*;?\s*$/.test(style)) {
            // {display:none !important} → plain element hiding (keep selector as-is)
        } else {
            // Other styles → :style(style)
            cssSel = cssSel + ':style(' + style + ')';
        }

        const compiled = compileSelector(cssSel, nativeCssHas);
        if (!compiled) {
            if (bareInvalid) {
                bareInvalid.add(`Rejected filter: ${originalLine}`);
            }
            return;
        }

        const domains = parseDomainList(left);
        if (!domains) {
            if (bareInvalid) bareInvalid.add(`Rejected filter: ${originalLine}`);
            return;
        }
        addSpecificCosmetic(specificCosmeticFilters, compiled, domains, exception);
        return;
    }

    // Cosmetic filter: ## or #@#
    if (type === 'cosmetic') {
        const hasOptions = left && left.length > 0;
        let selector = right;

        // Reject CSS injection via ## syntax: selector {style}
        // The OLD engine (csstree) fails to parse these and rejects them.
        // Match the pattern: content ending with { declarations }
        if (/\{[^}]*:[^}]+\}\s*$/.test(selector)) {
            if (bareInvalid) bareInvalid.add(`Rejected filter: ${originalLine}`);
            return;
        }

        // Compile selector
        const compiled = compileSelector(selector, nativeCssHas);

        if (exception) {
            // Cosmetic exception
            if (!hasOptions) {
                // Generic cosmetic exception (strip raw for matching against generic filters)
                if (compiled && compiled.length > 1) {
                    genericCosmeticExceptions.add(stripRawField(compiled));
                }
            } else {
                // Domain-specific exception: validate domain list.
                // In uBO, invalid hostnames (e.g., containing /) cause parser.hasError()
                // which produces a bare "Rejected filter" before reaching extended filter handling.
                const domains = parseDomainList(left);
                if (!domains) {
                    if (bareInvalid) bareInvalid.add(`Rejected filter: ${originalLine}`);
                }
                // Otherwise, domain-specific exceptions are skipped (handled at runtime)
            }
            return;
        }

        if (!hasOptions) {
            // Generic cosmetic filter (no domain specified)
            if (!compiled || compiled.length <= 1) return;
            if (typeof compiled === 'string' && compiled.charCodeAt(0) === 0x7B) return; // procedural

            const key = keyFromSelector(compiled);
            if (key === undefined) {
                // No extractable key → high-priority generic
                genericHighCosmeticFilters.add(compiled);
                return;
            }
            const typeChar = key.charCodeAt(0);
            const hash = hashFromStr(typeChar, key.slice(1));
            let bucket = genericCosmeticFilters.get(hash);
            if (bucket === undefined) {
                genericCosmeticFilters.set(hash, bucket = []);
            }
            bucket.push(compiled);
            return;
        }

        // Specific cosmetic filter (domain specified)
        if (!compiled) {
            // In uBO, invalid CSS selectors cause parser.hasError() which
            // produces a bare "Rejected filter" entry in the network ruleset.
            if (bareInvalid) {
                bareInvalid.add(`Rejected filter: ${originalLine}`);
            }
            return;
        }
        const domains = parseDomainList(left);
        if (!domains) {
            if (bareInvalid) bareInvalid.add(`Rejected filter: ${originalLine}`);
            return;
        }
        addSpecificCosmetic(specificCosmeticFilters, compiled, domains, exception);
    }
}

function addSpecificCosmetic(specificCosmeticFilters, compiled, domains, exception) {
    for (const { hn, not, bad } of domains) {
        if (bad) continue;
        if (exception) continue;

        let rejected;
        if (compiled === undefined || compiled === null) {
            rejected = `Invalid filter`;
        }

        const key = rejected || compiled;
        let details = specificCosmeticFilters.get(key);
        if (details === undefined) {
            details = {};
            if (rejected) { details.rejected = true; }
            specificCosmeticFilters.set(key, details);
        }
        if (rejected) continue;

        if (not) {
            if (details.excludeMatches === undefined) {
                details.excludeMatches = [];
            }
            details.excludeMatches.push(hn);
            continue;
        }
        if (details.matches === undefined) {
            details.matches = [];
        }
        if (details.matches.includes('*')) continue;
        if (hn === '*') {
            details.matches = ['*'];
            continue;
        }
        details.matches.push(hn);
    }
}
