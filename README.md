# CtrlBlk

CtrlBlk is a Mv3 Web Extension to personalize your web experience - Browse the web you want, not the one we've got!. It blocks ads, trackers, popups and other annoyances. When it doesn't block something, or in case anything else went wrong, it makes it super easy for users to report any issues they may be experiencing.

## Installation

To install CtrlBlk head over to [CtrlBlk's Chrome Web Store page](https://chromewebstore.google.com)

## Build CtrlBlk

Prerequisites:

- [nodejs](https://nodejs.org/en) >= v21.2.0
- [npm](https://www.npmjs.com/) 10.2.4

To build CtrlBlk:

```
$ git clone https://github.com/ctrlblk/ctrlblck.git
$ cd ctrlblk
$ npm install
$ npm run build
```

Then load CtrlBlk as an unpacked extension following this guide:

[Chrome for Developers Load unpacked extension tutorial](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)

For local development there is also a watch process that automatically rebuilds the extension whenever something changes.

`$ npm run watch`

To build a release version intended to be uploaded to the Chrome Web Store use:

`$ npm run build-release`

## CI Secrets

### CTRLBLOCK_DEPLOY_TOKEN

`CTRLBLOCK_DEPLOY_TOKEN` a GitHub access token to download and build the [uBlock](https://github.com/ctrlblk/uBlock) dependency. Only neccesary in case the uBlock repository isn't public.

### Chrome Web Store Publish API

To automatically upload builds using the [Chrome Web Store Publish API](https://developer.chrome.com/docs/webstore/using-api)

`CWS_CLIENT_ID` a CWS Oauth Client ID

`CWS_CLIENT_SECRET` a CWS Oauth Client Secret

`CWS_REFRESH_TOKEN` a CWS Oauth token to receive an access token to authenticate API requests

`CWS_EXTENSION_ID` the Extension ID

## About

- [GPLv3 license](LICENSE.txt)
- [Privacy Policy](https://ctrlblk.com/privacy)

## Acknowledgements

CtrlBlk makes use of the following open source projects:

- [uBlock Origin Lite](https://github.com/gorhill/uBlock)
- [nodejs](https://nodejs.org/en)
- [npm](https://www.npmjs.com/)
- Various others, see [package.json](package.json)
