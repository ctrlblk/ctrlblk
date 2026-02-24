import { test, expect } from '../helpers/fixtures.js';

test.describe('Redirect Filters', () => {
  test('redirect to noop.js prevents script execution', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/redirect.html');

    const executed = await page.evaluate(() => window.__redirect_target_executed);
    expect(executed).toBeUndefined();
  });
});
