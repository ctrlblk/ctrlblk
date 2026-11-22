import { test as base } from '@playwright/test';
import { launchBrowserWithExtension } from './extension.js';

let sharedContext = null;
let sharedServiceWorker = null;

export const test = base.extend({
  extensionContext: [async ({ headless }, use) => {
    if (!sharedContext) {
      // `headless` is Playwright's built-in option: false with --headed.
      const result = await launchBrowserWithExtension({ headless });
      sharedContext = result.context;
      sharedServiceWorker = result.serviceWorker;
    }
    await use(sharedContext);
  }, { scope: 'test' }],

  // eslint-disable-next-line no-unused-vars -- fixture dependency
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
