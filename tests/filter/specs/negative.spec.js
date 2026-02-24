import { test, expect } from '../helpers/fixtures.js';

test.describe('Negative Tests - Non-matching filters should not block', () => {
  test('non-matching image loads successfully', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/negative.html');

    const img = page.locator('#safe-img');
    await expect.poll(
      () => img.evaluate(el => el.naturalWidth),
      { timeout: 5000 }
    ).toBeGreaterThan(0);
  });

  test('non-matching script executes normally', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/negative.html');

    const loaded = await page.evaluate(() => window.__safe_script_loaded);
    expect(loaded).toBe(true);
  });

  test('domain-scoped element hiding does NOT apply on different domain', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/negative.html');

    // other-domain.example###negative-test-id should NOT hide on 127.0.0.1
    await expect(page.locator('#negative-test-id')).toBeVisible({ timeout: 5000 });
  });

  test('element hiding exception (#@#) keeps element visible', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/negative.html');

    // 127.0.0.1##.eh-excepted-class is overridden by 127.0.0.1#@#.eh-excepted-class
    await expect(page.locator('.eh-excepted-class')).toBeVisible({ timeout: 5000 });
  });
});
