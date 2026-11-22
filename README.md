# CtrlBlk

CtrlBlk is a Mv3 Web Extension to personalize your web experience - Browse the web you want, not the one we've got!. It blocks ads, trackers, popups and other annoyances. When it doesn't block something, or in case anything else went wrong, it makes it super easy for users to report any issues they may be experiencing.

## Installation

To install CtrlBlk head over to [CtrlBlk's Chrome Web Store page](https://chromewebstore.google.com/detail/gaccmpadgpjgakodbmbjmefanhjppepj)

## Build CtrlBlk

Prerequisites:

- [nodejs](https://nodejs.org/en) ^20.19.0, ^22.13.0 or >= 24
- [pnpm](https://pnpm.io/)

CI builds on Node 24.

To build CtrlBlk:

```
$ git clone https://github.com/ctrlblk/ctrlblck.git
$ cd ctrlblk
$ pnpm install
$ pnpm run build
```

Then load CtrlBlk as an unpacked extension following this guide:

[Chrome for Developers Load unpacked extension tutorial](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)

For local development there is also a watch process that automatically rebuilds the extension whenever something changes.

`$ pnpm run watch`

To build a release version intended to be uploaded to the Chrome Web Store use:

`$ pnpm run build-release`

## Run the tests

```
$ pnpm test:scriptlets
$ pnpm test:filter
$ pnpm test:youtube
```

`test:filter` and `test:youtube` run the extension in Playwright's Chromium, in headless mode, so they open no window and need no display. Install that Chromium once with:

`$ pnpm exec playwright install chromium`

To watch the browser while debugging, add `--headed`, for example:

`$ pnpm test:filter --headed`

CI runs `test:scriptlets` and `test:filter` on every push. `test:youtube` loads the live youtube.com, so it only runs locally. It opens a video in two ways, each time a fixed video that got a pre-roll ad without the extension when it was chosen: `VIDEO_ID` by loading its watch page, and `HOME_VIDEO_ID` from the home page, the way a click on a thumbnail opens it. To check that both videos still get one without the extension, run:

`$ YOUTUBE_CHECK_AD=1 pnpm test:youtube -g "still gets an ad"`

If a check fails, replace the video it names, `VIDEO_ID` or `HOME_VIDEO_ID` in `tests/youtube/specs/youtube-ads.spec.js`, with a video that gets an ad when opened that way.

## CI Secrets

### Chrome Web Store Publish API

To automatically upload builds using the [Chrome Web Store Publish API](https://developer.chrome.com/docs/webstore/using-api) via a [service account](https://developer.chrome.com/docs/webstore/service-accounts):

`CWS_SERVICE_ACCOUNT_KEY` the full JSON key file content for a Google Cloud service account with access to the Chrome Web Store API

`CWS_EXTENSION_ID` the Extension ID

## About

- [GPLv3 license](LICENSE.txt)
- [Privacy Policy](https://ctrlblk.com/privacy)

## Acknowledgements

CtrlBlk makes use of the following open source projects:

- [nodejs](https://nodejs.org/en)
- [pnpm](https://pnpm.io/)
- Various others, see [package.json](package.json)
