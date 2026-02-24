import { test, expect } from '../helpers/fixtures.js';

test.describe('Exception Filters', () => {
  test('@@exception overrides blocking filter', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/exception.html');

    const blockedLoaded = await page.evaluate(() => window.__blocked_loaded);
    expect(blockedLoaded).toBeUndefined();

    const allowedLoaded = await page.evaluate(() => window.__allowed_loaded);
    expect(allowedLoaded).toBe(true);
  });

  test('@@exception with $image whitelists specific image', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/exception.html');

    const blockedImg = page.locator('#exception-blocked-img');
    await expect.poll(
      () => blockedImg.evaluate(el => el.naturalWidth),
      { timeout: 5000 }
    ).toBe(0);

    const allowedImg = page.locator('#exception-allowed-img');
    await expect.poll(
      () => allowedImg.evaluate(el => el.naturalWidth),
      { timeout: 5000 }
    ).toBeGreaterThan(0);
  });

  test('element hiding exception (#@#) keeps element visible', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/negative.html');

    // 127.0.0.1##.eh-excepted-class + 127.0.0.1#@#.eh-excepted-class => exception wins
    await expect(page.locator('.eh-excepted-class')).toBeVisible({ timeout: 5000 });
  });
});
