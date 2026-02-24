import { test, expect } from '../helpers/fixtures.js';

test.describe('Resource Type Blocking', () => {
  test('$stylesheet filter blocks ad CSS', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/resource-types.html');

    // The ad stylesheet sets --ad-css-loaded: 1; if blocked, it won't be set
    await expect.poll(
      () => page.evaluate(() => {
        return getComputedStyle(document.body).getPropertyValue('--ad-css-loaded').trim();
      }),
      { timeout: 5000 }
    ).not.toBe('1');
  });

  test('$media filter blocks video', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/resource-types.html');

    await expect.poll(
      () => page.evaluate(() => window.__media_result),
      { timeout: 5000 }
    ).toBe('blocked');
  });
});
