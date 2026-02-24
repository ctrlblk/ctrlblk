import { test, expect } from '../helpers/fixtures.js';

test.describe('Inline CSS', () => {
  test('declarative CSS sets visibility to hidden', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/inline-css.html');

    const overlay = page.locator('.overlay-ad');
    await expect.poll(
      () => overlay.evaluate(el => getComputedStyle(el).visibility),
      { timeout: 10000 }
    ).toBe('hidden');

    await expect(page.locator('#visibility-hidden-section .testcase-examplecontent')).toBeVisible();
  });

  test('declarative CSS changes background-color', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/inline-css.html');

    const target = page.locator('.css-bg-target');
    await expect.poll(
      () => target.evaluate(el => getComputedStyle(el).backgroundColor),
      { timeout: 10000 }
    ).toBe('rgb(0, 128, 0)');
  });

  test('declarative CSS sets display to none', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/inline-css.html');

    const target = page.locator('.css-display-target');
    await expect.poll(
      () => target.evaluate(el => getComputedStyle(el).display),
      { timeout: 10000 }
    ).toBe('none');
  });
});
