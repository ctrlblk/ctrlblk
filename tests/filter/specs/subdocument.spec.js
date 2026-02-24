import { test, expect } from '../helpers/fixtures.js';

test.describe('Subdocument Blocking', () => {
  test('$subdocument filter blocks iframe loading', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/subdocument.html');

    const frame = page.frameLocator('#subdoc-frame');

    // The iframe content should be blocked — #subdoc-loaded should not exist
    // We wait briefly to give it a chance to load, then verify it didn't
    await page.waitForTimeout(2000);

    const count = await frame.locator('#subdoc-loaded').count().catch(() => 0);
    expect(count).toBe(0);
  });
});
