import { test as base } from '@playwright/test';
import { launchBrowserWithExtension } from './extension.js';

// Shared browser context across all tests in the worker
let sharedContext = null;
let sharedServiceWorker = null;
let sharedExtensionId = null;

/**
 * Custom test fixture that provides a shared browser context with the
 * extension loaded. The context is created once and reused across all tests.
 */
export const test = base.extend({
  // Shared context — created once per worker, reused for all tests
  extensionContext: [async ({}, use) => {
    if (!sharedContext) {
      const result = await launchBrowserWithExtension();
      sharedContext = result.context;
      sharedServiceWorker = result.serviceWorker;
      sharedExtensionId = result.extensionId;
    }
    await use(sharedContext);
  }, { scope: 'test' }],

  serviceWorker: [async ({ extensionContext }, use) => {
    await use(sharedServiceWorker);
  }, { scope: 'test' }],

  // Fresh page for each test, auto-closed after
  extensionPage: [async ({ extensionContext }, use) => {
    const page = await extensionContext.newPage();
    await use(page);
    await page.close();
  }, { scope: 'test' }],
});

export { expect } from '@playwright/test';
