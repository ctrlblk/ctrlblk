import { test, expect } from '../helpers/fixtures.js';
import { launchBrowserWithoutExtension } from '../helpers/extension.js';

// A video that got a pre-roll ad without the extension when it was chosen.
// Ad serving changes over time. To check that this video still gets an ad
// without the extension, run:
//
//   YOUTUBE_CHECK_AD=1 pnpm test:youtube -g "still gets an ad"
//
// If that fails, the ad check below proves nothing: replace VIDEO_ID with a
// video that gets an ad without the extension.
const VIDEO_ID = 'dQw4w9WgXcQ';

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
 * Open VIDEO_ID and watch the player for `ms` milliseconds.
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
async function watchPlayer(page, ms) {
  await page.goto(`https://www.youtube.com/watch?v=${VIDEO_ID}`, {
    waitUntil: 'domcontentloaded',
  });
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

test.describe('YouTube Ad Blocking', () => {
  test('blocks the pre-roll ad and the video plays', async ({
    extensionContext,
    extensionPage: page,
  }) => {
    await rejectCookieConsent(extensionContext);

    const { adSeen, startTime, endTime } = await watchPlayer(page, WATCH_MS);

    expect(adSeen, `an ad showed while watching ${VIDEO_ID}`).toBe(false);
    expect(
      (endTime ?? 0) - (startTime ?? 0),
      `video ${VIDEO_ID} didn't play: currentTime went from ${startTime} ` +
        `to ${endTime} in ${WATCH_MS / 1000} s`,
    ).toBeGreaterThanOrEqual(MIN_PLAYED_SECONDS);
  });

  test('chosen video still gets an ad without the extension', async ({
    headless,
  }) => {
    test.skip(
      !process.env.YOUTUBE_CHECK_AD,
      'set YOUTUBE_CHECK_AD=1 to check that VIDEO_ID still gets an ad',
    );

    const context = await launchBrowserWithoutExtension({ headless });
    try {
      await rejectCookieConsent(context);
      const page = await context.newPage();
      const { adSeen } = await watchPlayer(page, WATCH_MS);
      expect(
        adSeen,
        `no ad showed for ${VIDEO_ID} without the extension; ` +
          'replace VIDEO_ID with a video that gets one',
      ).toBe(true);
    } finally {
      await context.close();
    }
  });
});
