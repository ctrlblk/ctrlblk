import { test, expect } from '../helpers/fixtures.js';

test.describe('YouTube Ad Blocking', () => {
  test('blocks pre-roll ad when navigating from search results', async ({ extensionPage: page }) => {
    // Navigate to YouTube search results
    await page.goto('https://www.youtube.com/results?search_query=mr+beast', {
      waitUntil: 'domcontentloaded',
    });

    // Wait for search results to load
    await page.waitForSelector('ytd-video-renderer a#video-title', { timeout: 15000 });

    // Click the first video result
    const firstVideo = page.locator('ytd-video-renderer a#video-title').first();
    await firstVideo.click();

    // Wait for the video player to appear
    await page.waitForSelector('#movie_player', { timeout: 15000 });

    // Wait for video to load and any ad to start
    await page.waitForTimeout(8000);

    // Check that no ad is currently showing
    const adShowing = await page.evaluate(() => {
      const player = document.querySelector('#movie_player');
      if (!player) return false;
      return player.classList.contains('ad-showing');
    });

    expect(adShowing).toBe(false);
  });
});
