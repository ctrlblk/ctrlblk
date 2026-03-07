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
});
