// Assembles and exports builtinScriptlets array.

// Helpers
import safeSelf from './helpers/safe-self.fn.js';
import getExceptionToken from './helpers/get-exception-token.fn.js';
import shouldDebug from './helpers/should-debug.fn.js';
import runAt from './helpers/run-at.fn.js';
import runAtHtmlElement from './helpers/run-at-html-element.fn.js';
import generateContent from './helpers/generate-content.fn.js';
import abortCurrentScriptCore from './helpers/abort-current-script-core.fn.js';
import validateConstant from './helpers/validate-constant.fn.js';
import setConstantHelper from './helpers/set-constant.fn.js';
import replaceNodeText from './helpers/replace-node-text.fn.js';
import objectPrune from './helpers/object-prune.fn.js';
import objectFindOwner from './helpers/object-find-owner.fn.js';
import getAllCookies from './helpers/get-all-cookies.fn.js';
import getAllLocalStorage from './helpers/get-all-local-storage.fn.js';
import getCookie from './helpers/get-cookie.fn.js';
import setCookieHelper from './helpers/set-cookie.fn.js';
import setLocalStorageItemHelper from './helpers/set-local-storage-item.fn.js';
import matchesStackTrace from './helpers/matches-stack-trace.fn.js';
import parsePropertiesToMatch from './helpers/parse-properties-to-match.fn.js';
import matchObjectProperties from './helpers/match-object-properties.fn.js';
import jsonPruneFetchResponseHelper from './helpers/json-prune-fetch-response.fn.js';
import replaceFetchResponseHelper from './helpers/replace-fetch-response.fn.js';
import proxyApply from './helpers/proxy-apply.fn.js';

// Scriptlets
import abortCurrentScript from './scriptlets/abort-current-script.js';
import abortOnPropertyRead from './scriptlets/abort-on-property-read.js';
import abortOnPropertyWrite from './scriptlets/abort-on-property-write.js';
import abortOnStackTrace from './scriptlets/abort-on-stack-trace.js';
import addEventListenerDefuser from './scriptlets/addEventListener-defuser.js';
import jsonPrune from './scriptlets/json-prune.js';
import jsonPruneFetchResponse from './scriptlets/json-prune-fetch-response.js';
import jsonPruneXhrResponse from './scriptlets/json-prune-xhr-response.js';
import evaldataPrune from './scriptlets/evaldata-prune.js';
import adjustSetInterval from './scriptlets/adjust-setInterval.js';
import adjustSetTimeout from './scriptlets/adjust-setTimeout.js';
import noevalIf from './scriptlets/noeval-if.js';
import preventFetch from './scriptlets/prevent-fetch.js';
import preventRefresh from './scriptlets/prevent-refresh.js';
import removeAttr from './scriptlets/remove-attr.js';
import removeClass from './scriptlets/remove-class.js';
import noRequestAnimationFrameIf from './scriptlets/no-requestAnimationFrame-if.js';
import setConstant from './scriptlets/set-constant.js';
import noSetIntervalIf from './scriptlets/no-setInterval-if.js';
import noSetTimeoutIf from './scriptlets/no-setTimeout-if.js';
import webrtcIf from './scriptlets/webrtc-if.js';
import noXhrIf from './scriptlets/no-xhr-if.js';
import noWindowOpenIf from './scriptlets/no-window-open-if.js';
import closeWindow from './scriptlets/close-window.js';
import windowNameDefuser from './scriptlets/window.name-defuser.js';
import overlayBuster from './scriptlets/overlay-buster.js';
import alertBuster from './scriptlets/alert-buster.js';
import nowebrtc from './scriptlets/nowebrtc.js';
import disableNewtabLinks from './scriptlets/disable-newtab-links.js';
import removeCookie from './scriptlets/remove-cookie.js';
import xmlPrune from './scriptlets/xml-prune.js';
import m3uPrune from './scriptlets/m3u-prune.js';
import hrefSanitizer from './scriptlets/href-sanitizer.js';
import callNothrow from './scriptlets/call-nothrow.js';
import spoofCSS from './scriptlets/spoof-css.js';
import removeNodeText from './scriptlets/remove-node-text.js';
import setCookie from './scriptlets/set-cookie.js';
import setCookieReload from './scriptlets/set-cookie-reload.js';
import setLocalStorageItem from './scriptlets/set-local-storage-item.js';
import setSessionStorageItem from './scriptlets/set-session-storage-item.js';
import setAttr from './scriptlets/set-attr.js';
import preventCanvas from './scriptlets/prevent-canvas.js';
import multiup from './scriptlets/multiup.js';
import removeCacheStorageItem from './scriptlets/remove-cache-storage-item.js';
import trustedReplaceNodeText from './scriptlets/trusted-replace-node-text.js';
import trustedSetConstant from './scriptlets/trusted-set-constant.js';
import trustedSetCookie from './scriptlets/trusted-set-cookie.js';
import trustedSetCookieReload from './scriptlets/trusted-set-cookie-reload.js';
import trustedSetLocalStorageItem from './scriptlets/trusted-set-local-storage-item.js';
import trustedSetSessionStorageItem from './scriptlets/trusted-set-session-storage-item.js';
import trustedReplaceFetchResponse from './scriptlets/trusted-replace-fetch-response.js';
import trustedReplaceXhrResponse from './scriptlets/trusted-replace-xhr-response.js';
import trustedClickElement from './scriptlets/trusted-click-element.js';
import trustedPruneInboundObject from './scriptlets/trusted-prune-inbound-object.js';
import trustedPruneOutboundObject from './scriptlets/trusted-prune-outbound-object.js';
import trustedReplaceArgument from './scriptlets/trusted-replace-argument.js';
import trustedReplaceOutboundText from './scriptlets/trusted-replace-outbound-text.js';
import trustedSuppressNativeMethod from './scriptlets/trusted-suppress-native-method.js';

export const builtinScriptlets = [
    // Helpers (23)
    safeSelf,
    getExceptionToken,
    shouldDebug,
    runAt,
    runAtHtmlElement,
    generateContent,
    abortCurrentScriptCore,
    validateConstant,
    setConstantHelper,
    replaceNodeText,
    objectPrune,
    objectFindOwner,
    getAllCookies,
    getAllLocalStorage,
    getCookie,
    setCookieHelper,
    setLocalStorageItemHelper,
    matchesStackTrace,
    parsePropertiesToMatch,
    matchObjectProperties,
    jsonPruneFetchResponseHelper,
    replaceFetchResponseHelper,
    proxyApply,
    // User-facing scriptlets (58)
    abortCurrentScript,
    abortOnPropertyRead,
    abortOnPropertyWrite,
    abortOnStackTrace,
    addEventListenerDefuser,
    jsonPrune,
    jsonPruneFetchResponse,
    jsonPruneXhrResponse,
    evaldataPrune,
    adjustSetInterval,
    adjustSetTimeout,
    noevalIf,
    preventFetch,
    preventRefresh,
    removeAttr,
    removeClass,
    noRequestAnimationFrameIf,
    setConstant,
    noSetIntervalIf,
    noSetTimeoutIf,
    webrtcIf,
    noXhrIf,
    noWindowOpenIf,
    closeWindow,
    windowNameDefuser,
    overlayBuster,
    alertBuster,
    nowebrtc,
    disableNewtabLinks,
    removeCookie,
    xmlPrune,
    m3uPrune,
    hrefSanitizer,
    callNothrow,
    spoofCSS,
    removeNodeText,
    setCookie,
    setCookieReload,
    setLocalStorageItem,
    setSessionStorageItem,
    setAttr,
    preventCanvas,
    multiup,
    removeCacheStorageItem,
    trustedReplaceNodeText,
    trustedSetConstant,
    trustedSetCookie,
    trustedSetCookieReload,
    trustedSetLocalStorageItem,
    trustedSetSessionStorageItem,
    trustedReplaceFetchResponse,
    trustedReplaceXhrResponse,
    trustedClickElement,
    trustedPruneInboundObject,
    trustedPruneOutboundObject,
    trustedReplaceArgument,
    trustedReplaceOutboundText,
    trustedSuppressNativeMethod,
];
