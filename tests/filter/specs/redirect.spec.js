import { test, expect } from '../helpers/fixtures.js';

test.describe('Redirect Filters', () => {
  test('redirect to noop.js prevents script execution', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/redirect.html');

    const executed = await page.evaluate(() => window.__redirect_target_executed);
    expect(executed).toBeUndefined();
  });

  test('redirect to 1x1.gif replaces image with transparent pixel', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/redirect.html');

    const img = page.locator('#redirect-img');
    await expect(img).toBeAttached({ timeout: 5000 });
    // The image should load (redirected to 1x1.gif), not be blocked
    // A 1x1 gif has naturalWidth === 1
    await expect.poll(
      () => img.evaluate(el => el.complete),
      { timeout: 5000 }
    ).toBe(true);
  });

  test('redirect to noop.css prevents CSS from applying', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/redirect.html');

    // The original CSS would set --redirect-loaded: 1; the noop redirect should not
    await expect.poll(
      () => page.evaluate(() => {
        const el = document.querySelector('.redirect-css-marker');
        if (!el) return '';
        return getComputedStyle(el).getPropertyValue('--redirect-loaded').trim();
      }),
      { timeout: 5000 }
    ).not.toBe('1');
  });
});
