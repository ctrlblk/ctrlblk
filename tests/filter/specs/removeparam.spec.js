import { test, expect } from '../helpers/fixtures.js';

test.describe('Removeparam Filters', () => {
  test('strips utm_source from request', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/removeparam.html');

    await expect.poll(
      () => page.evaluate(() => window.__removeparam_result),
      { timeout: 10000 }
    ).toBeTruthy();

    const params = await page.evaluate(() => window.__removeparam_result);
    expect(params).not.toHaveProperty('utm_source');
    expect(params).toHaveProperty('page', '1');
  });

  test('strips multiple tracking params from single request', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/removeparam.html');

    await expect.poll(
      () => page.evaluate(() => window.__removeparam_multi_result),
      { timeout: 10000 }
    ).toBeTruthy();

    const params = await page.evaluate(() => window.__removeparam_multi_result);
    expect(params).not.toHaveProperty('utm_source');
    expect(params).not.toHaveProperty('utm_medium');
    expect(params).not.toHaveProperty('fbclid');
    // Non-tracking params should be preserved
    expect(params).toHaveProperty('page', '2');
    expect(params).toHaveProperty('sort', 'date');
  });

  test('preserves all params when none match removeparam filters', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/removeparam.html');

    await expect.poll(
      () => page.evaluate(() => window.__removeparam_nomatch_result),
      { timeout: 10000 }
    ).toBeTruthy();

    const params = await page.evaluate(() => window.__removeparam_nomatch_result);
    expect(params).toHaveProperty('category', 'news');
    expect(params).toHaveProperty('lang', 'en');
  });
});
