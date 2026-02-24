import { test, expect } from '../helpers/fixtures.js';

test.describe('Element Hiding', () => {
  test('ID selector hides element', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/element-hiding.html');

    await expect(page.locator('#eh-id')).toBeHidden({ timeout: 10000 });
    await expect(page.locator('#id-selector-section .testcase-examplecontent')).toBeVisible();
  });

  test('class selector hides element', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/element-hiding.html');

    await expect(page.locator('.eh-class')).toBeHidden({ timeout: 10000 });
    await expect(page.locator('#class-selector-section .testcase-examplecontent')).toBeVisible();
  });

  test('descendant selector hides element', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/element-hiding.html');

    await expect(page.locator('.eh-descendant')).toBeHidden({ timeout: 10000 });
    await expect(page.locator('#descendant-selector-section .testcase-examplecontent')).toBeVisible();
  });

  test('attribute selector hides element', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/element-hiding.html');

    await expect(page.locator('div[data-ad="true"]')).toBeHidden({ timeout: 10000 });
    await expect(page.locator('#attribute-selector-section .testcase-examplecontent')).toBeVisible();
  });

  test('generic cosmetic filter hides element', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/element-hiding.html');

    await expect(page.locator('#generic-cosmetic-section .ad-banner')).toBeHidden({ timeout: 10000 });
    await expect(page.locator('#generic-cosmetic-section .testcase-examplecontent')).toBeVisible();
  });

  test('sibling selector hides element', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/element-hiding.html');

    await expect(page.locator('.eh-sibling')).toBeHidden({ timeout: 10000 });
    await expect(page.locator('#sibling-selector-section .testcase-examplecontent')).toBeVisible();
  });

  test('attribute starts-with selector hides element', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/element-hiding.html');

    await expect(page.locator('div[data-ad-type^="banner"]')).toBeHidden({ timeout: 10000 });
    await expect(page.locator('#attr-startswith-section .testcase-examplecontent')).toBeVisible();
  });

  test('generic cosmetic filter hides dynamically-created element', async ({ extensionPage: page }) => {
    await page.goto('http://127.0.0.1:9876/element-hiding.html');

    const dynEl = page.locator('#dynamic-ad-banner');
    await expect(dynEl).toBeAttached({ timeout: 5000 });
    await expect(dynEl).toBeHidden({ timeout: 10000 });
  });
});
