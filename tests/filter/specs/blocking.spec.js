import { test, expect } from '../helpers/fixtures.js';

test.describe('Network Blocking', () => {
  test('full path filter blocks image', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/blocking.html');

    const img = page.locator('#full-path-img');
    await expect.poll(
      () => img.evaluate(el => el.naturalWidth),
      { timeout: 5000 }
    ).toBe(0);

    await expect(page.locator('#full-path-area .testcase-examplecontent')).toBeVisible();
  });

  test('partial path filter blocks image', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/blocking.html');

    const img = page.locator('#partial-path-img');
    await expect.poll(
      () => img.evaluate(el => el.naturalWidth),
      { timeout: 5000 }
    ).toBe(0);
  });

  test('wildcard filter blocks matching images', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/blocking.html');

    const img1 = page.locator('#wildcard-img-1');
    const img2 = page.locator('#wildcard-img-2');

    await expect.poll(
      () => img1.evaluate(el => el.naturalWidth),
      { timeout: 5000 }
    ).toBe(0);
    await expect.poll(
      () => img2.evaluate(el => el.naturalWidth),
      { timeout: 5000 }
    ).toBe(0);
  });

  test('script blocking prevents execution', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/blocking.html');

    const adLoaded = await page.evaluate(() => window.__ad_loaded);
    expect(adLoaded).toBeUndefined();
  });

  test('$image filter blocks dynamically-created image', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/blocking.html');

    const img = page.locator('#dynamic-img');
    await expect(img).toBeAttached({ timeout: 5000 });
    await expect.poll(
      () => img.evaluate(el => el.naturalWidth),
      { timeout: 5000 }
    ).toBe(0);
  });

  test('$xmlhttprequest filter blocks fetch request', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/blocking.html');

    await expect.poll(
      () => page.evaluate(() => window.__xhr_result),
      { timeout: 5000 }
    ).toBe('blocked');
  });
});
