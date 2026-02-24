import { test, expect } from '../helpers/fixtures.js';

test.describe('Procedural CSS', () => {
  test(':has-text() hides element with matching text', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/procedural-css.html');

    const items = page.locator('#has-text-section .proc-has-text');
    await expect(items.nth(0)).toBeHidden({ timeout: 10000 });
    await expect(items.nth(1)).toBeVisible();
  });

  test(':has-text() with regex hides matching element', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/procedural-css.html');

    const items = page.locator('#has-text-regex-section .proc-has-text-regex');
    await expect(items.nth(0)).toBeHidden({ timeout: 10000 });
    await expect(items.nth(1)).toBeVisible();
  });

  test(':upward(N) hides parent element', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/procedural-css.html');

    await expect(page.locator('#proc-upward-n-parent')).toBeHidden({ timeout: 10000 });
    await expect(page.locator('#upward-n-section .testcase-examplecontent')).toBeVisible();
  });

  test(':upward(selector) hides matching ancestor', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/procedural-css.html');

    await expect(page.locator('.proc-upward-wrapper')).toBeHidden({ timeout: 10000 });
    await expect(page.locator('#upward-sel-section .testcase-examplecontent')).toBeVisible();
  });

  test(':matches-attr() hides element with matching attribute', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/procedural-css.html');

    const items = page.locator('#matches-attr-section .proc-matches-attr');
    await expect(items.nth(0)).toBeHidden({ timeout: 10000 });
    await expect(items.nth(1)).toBeVisible();
  });

  test(':min-text-length() hides element with long text', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/procedural-css.html');

    const items = page.locator('#min-text-length-section .proc-min-text');
    await expect(items.nth(0)).toBeHidden({ timeout: 10000 });
    await expect(items.nth(1)).toBeVisible();
  });

  test(':remove() removes element from DOM', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/procedural-css.html');

    await expect(page.locator('.proc-remove-target')).toHaveCount(0, { timeout: 10000 });
    await expect(page.locator('#remove-section .testcase-examplecontent')).toBeVisible();
  });

  test(':remove-attr() removes attribute from element', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/procedural-css.html');

    const el = page.locator('.proc-remove-attr-target');
    await expect.poll(
      () => el.evaluate(node => node.hasAttribute('data-tracking')),
      { timeout: 10000 }
    ).toBe(false);
    await expect(el).toBeVisible();
  });

  test(':remove-class() removes class from element', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/procedural-css.html');

    const el = page.locator('.proc-remove-class-target');
    await expect.poll(
      () => el.evaluate(node => node.classList.contains('ad-highlight')),
      { timeout: 10000 }
    ).toBe(false);
    await expect(el).toBeVisible();
  });

  test(':if() hides element when child matches condition', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/procedural-css.html');

    const items = page.locator('#if-section .proc-if-container');
    await expect(items.nth(0)).toBeHidden({ timeout: 10000 });
    await expect(items.nth(1)).toBeVisible();
  });

  test(':has-text():style() applies style to matching element', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/procedural-css.html');

    const items = page.locator('#style-section .proc-style-target');
    await expect.poll(
      () => items.nth(0).evaluate(el => getComputedStyle(el).display),
      { timeout: 10000 }
    ).toBe('none');
    await expect(items.nth(1)).toBeVisible();
  });
});
