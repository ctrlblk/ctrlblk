import { test, expect } from '../helpers/fixtures.js';
import { launchBrowserWithoutExtension } from '../helpers/extension.js';

// Videos that got a pre-roll ad without the extension when they were chosen:
// VIDEO_ID when opened directly, HOME_VIDEO_ID when opened from the home page
// (the video from issue #5). Ad serving changes over time. To check that they
// still get an ad without the extension, run:
//
//   YOUTUBE_CHECK_AD=1 pnpm test:youtube -g "still gets an ad"
//
// If that fails, the matching ad check below proves nothing: replace the video
// with one that gets an ad without the extension.
const VIDEO_ID = 'dQw4w9WgXcQ';
const HOME_VIDEO_ID = 'KBj5zrHSliQ';

// How long to watch the video, and how far it must play in that time.
const WATCH_MS = 20000;
const MIN_PLAYED_SECONDS = 10;
const SAMPLE_MS = 250;

/**
 * Reject YouTube's EU cookie consent, so its dialog doesn't block playback.
 * This keeps the test independent of the extension's filters hiding it.
 */
async function rejectCookieConsent(context) {
  await context.addCookies([
    {
      name: 'SOCS',
      value: 'CAI',
      domain: '.youtube.com',
      path: '/',
      secure: true,
      sameSite: 'Lax',
    },
  ]);
}

/**
 * Open the video by loading its watch page.
 */
async function openDirectly(page, videoId) {
  await page.goto(`https://www.youtube.com/watch?v=${videoId}`, {
    waitUntil: 'domcontentloaded',
  });
}

/**
 * Open the home page, then the video from within the app, as a click on a
 * thumbnail does: fire YouTube's own `yt-navigate` event on `ytd-app`.
 */
async function openFromHome(page, videoId) {
  await page.goto('https://www.youtube.com/', {
    waitUntil: 'domcontentloaded',
  });
  // Once the home page shows its grid, the app handles navigation events.
  await page.waitForSelector('ytd-app ytd-rich-grid-renderer', {
    state: 'attached',
  });
  await page.evaluate((id) => {
    const url = `/watch?v=${id}`;
    document.querySelector('ytd-app').dispatchEvent(
      new CustomEvent('yt-navigate', {
        bubbles: true,
        composed: true,
        detail: {
          endpoint: {
            commandMetadata: {
              webCommandMetadata: {
                url,
                webPageType: 'WEB_PAGE_TYPE_WATCH',
                rootVe: 3832,
              },
            },
            watchEndpoint: { videoId: id },
          },
        },
      }),
    );
  }, videoId);
  await page.waitForURL(`**/watch?v=${videoId}*`);
}

/**
 * Open the video with `open(page, videoId)` and watch the player for `ms`
 * milliseconds.
 *
 * An ad counts as seen if `#movie_player` has the `ad-showing` class at any
 * point: a MutationObserver records every class change, and the test also
 * samples the class every SAMPLE_MS.
 *
 * startTime and endTime are the video's `currentTime` at the first and last
 * sample taken while no ad was showing, or null if there was none.
 *
 * Returns { adSeen, startTime, endTime }.
 */
async function watchPlayer(page, ms, open, videoId) {
  await open(page, videoId);
  await page.waitForSelector('#movie_player video', { state: 'attached' });

  await page.evaluate(() => {
    const player = document.querySelector('#movie_player');
    window.__ctrlblkAdSeen = player.classList.contains('ad-showing');
    new MutationObserver(() => {
      if (player.classList.contains('ad-showing')) {
        window.__ctrlblkAdSeen = true;
      }
    }).observe(player, { attributes: true, attributeFilter: ['class'] });
  });

  let adSeen = false;
  let startTime = null;
  let endTime = null;
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    const sample = await page.evaluate(() => {
      const player = document.querySelector('#movie_player');
      const video = document.querySelector('#movie_player video');
      return {
        adShowing: !!player && player.classList.contains('ad-showing'),
        currentTime: video ? video.currentTime : null,
      };
    });
    if (sample.adShowing) {
      adSeen = true;
    } else if (sample.currentTime !== null) {
      if (startTime === null) {
        startTime = sample.currentTime;
      }
      endTime = sample.currentTime;
    }
    await page.waitForTimeout(SAMPLE_MS);
  }

  adSeen = adSeen || (await page.evaluate(() => window.__ctrlblkAdSeen));
  return { adSeen, startTime, endTime };
}

// The two ways of opening a video, each with the video that gets an ad that way.
const CASES = [
  {
    title: 'blocks the pre-roll ad and the video plays',
    checkTitle: 'chosen video still gets an ad without the extension',
    open: openDirectly,
    videoId: VIDEO_ID,
  },
  {
    title: 'blocks the pre-roll ad when a video is opened from the home page',
    checkTitle:
      'video opened from the home page still gets an ad without the extension',
    open: openFromHome,
    videoId: HOME_VIDEO_ID,
  },
];

test.describe('YouTube Ad Blocking', () => {
  for (const { title, checkTitle, open, videoId } of CASES) {
    test(title, async ({ extensionContext, extensionPage: page }) => {
      await rejectCookieConsent(extensionContext);

      const { adSeen, startTime, endTime } = await watchPlayer(
        page,
        WATCH_MS,
        open,
        videoId,
      );

      expect(adSeen, `an ad showed while watching ${videoId}`).toBe(false);
      expect(
        (endTime ?? 0) - (startTime ?? 0),
        `video ${videoId} didn't play: currentTime went from ${startTime} ` +
          `to ${endTime} in ${WATCH_MS / 1000} s`,
      ).toBeGreaterThanOrEqual(MIN_PLAYED_SECONDS);
    });

    test(checkTitle, async ({ headless }) => {
      test.skip(
        !process.env.YOUTUBE_CHECK_AD,
        `set YOUTUBE_CHECK_AD=1 to check that ${videoId} still gets an ad`,
      );

      const context = await launchBrowserWithoutExtension({ headless });
      try {
        await rejectCookieConsent(context);
        const page = await context.newPage();
        const { adSeen } = await watchPlayer(page, WATCH_MS, open, videoId);
        expect(
          adSeen,
          `no ad showed for ${videoId} without the extension; ` +
            'replace it with a video that gets one',
        ).toBe(true);
      } finally {
        await context.close();
      }
    });
  }
});
