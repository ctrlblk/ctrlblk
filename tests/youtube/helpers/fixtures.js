import { test as base } from '@playwright/test';
import { launchBrowserWithExtension } from './extension.js';

let sharedContext = null;
let sharedServiceWorker = null;
let sharedExtensionId = null;

export const test = base.extend({
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

  extensionPage: [async ({ extensionContext }, use) => {
    const page = await extensionContext.newPage();
    await use(page);
    await page.close();
  }, { scope: 'test' }],
});

export { expect } from '@playwright/test';
