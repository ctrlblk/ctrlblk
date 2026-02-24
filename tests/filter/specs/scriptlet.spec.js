import { test, expect } from '../helpers/fixtures.js';

test.describe('Scriptlet Injection', () => {
  test('abort-on-property-read throws on property access', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/scriptlet.html');

    const threw = await page.evaluate(() => {
      try {
        void window.__should_abort;
        return false;
      } catch (e) {
        return true;
      }
    });
    expect(threw).toBe(true);
  });

  test('set-cookie scriptlet sets expected cookie', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/scriptlet.html');

    await expect.poll(
      () => page.evaluate(() => document.cookie),
      { timeout: 5000 }
    ).toContain('e2e_test=true');
  });

  test('abort-on-property-write throws on property assignment', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/scriptlet.html');

    const threw = await page.evaluate(() => {
      try {
        window.__ad_property = 'value';
        return false;
      } catch (e) {
        return true;
      }
    });
    expect(threw).toBe(true);
  });

  test('abort-current-script prevents script execution', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/scriptlet.html');

    const ran = await page.evaluate(() => window.__acs_script_ran);
    expect(ran).not.toBe(true);
  });

  test('set-constant sets property to false', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/scriptlet.html');

    const value = await page.evaluate(() => window.__ad_enabled);
    expect(value).toBe(false);
  });

  test('no-setTimeout-if blocks matching setTimeout', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/scriptlet.html');

    // Wait long enough for the setTimeout(trackAds, 100) to have fired if not blocked
    await page.waitForTimeout(500);
    const ran = await page.evaluate(() => window.__trackAds_ran);
    expect(ran).toBeUndefined();
  });

  test('addEventListener-defuser prevents matching listener', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/scriptlet.html');

    // Trigger a click event on the body
    await page.locator('body').click();
    await page.waitForTimeout(100);
    const ran = await page.evaluate(() => window.__showAd_ran);
    expect(ran).toBeUndefined();
  });

  test('json-prune removes matching property from parsed JSON', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/scriptlet.html');

    const result = await page.evaluate(() => window.__json_prune_result);
    expect(result).not.toHaveProperty('ad_config');
    expect(result).toHaveProperty('content');
    expect(result.content.title).toBe('article');
  });

  test('set-local-storage-item sets localStorage value', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/scriptlet.html');

    await expect.poll(
      () => page.evaluate(() => localStorage.getItem('e2e_storage_test')),
      { timeout: 5000 }
    ).toBe('true');
  });

  test('remove-attr removes matching attribute', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/scriptlet.html');

    const target = page.locator('#remove-attr-target');
    await expect.poll(
      () => target.evaluate(el => el.hasAttribute('data-ad-loaded')),
      { timeout: 5000 }
    ).toBe(false);
  });

  test('remove-class removes matching class', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/scriptlet.html');

    const target = page.locator('#remove-class-target');
    await expect.poll(
      () => target.evaluate(el => el.classList.contains('ad-injected')),
      { timeout: 5000 }
    ).toBe(false);

    const hasContentArea = await target.evaluate(el => el.classList.contains('content-area'));
    expect(hasContentArea).toBe(true);
  });
});
