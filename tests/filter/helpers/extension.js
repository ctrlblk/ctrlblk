import { chromium } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const extensionPath = join(__dirname, '..', '..', '..', 'dist');

/**
 * Launch a browser with the CtrlBlk extension loaded.
 * Returns { context, extensionId, serviceWorker }.
 */
export async function launchBrowserWithExtension() {
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-first-run',
      '--disable-gpu',
    ],
  });

  // Wait for the service worker to be registered
  let serviceWorker;
  if (context.serviceWorkers().length > 0) {
    serviceWorker = context.serviceWorkers()[0];
  } else {
    serviceWorker = await context.waitForEvent('serviceworker');
  }

  // Extract extension ID from the service worker URL
  const extensionId = serviceWorker.url().split('/')[2];

  // Wait for the extension to fully initialize:
  // - storage populated (setFilteringMode completed)
  // - content scripts registered (registerInjectables completed)
  await serviceWorker.evaluate(async () => {
    const maxWait = 20000;
    const interval = 300;
    let elapsed = 0;
    while (elapsed < maxWait) {
      const [storageData, scripts] = await Promise.all([
        chrome.storage.local.get('filteringModeDetails'),
        chrome.scripting.getRegisteredContentScripts(),
      ]);
      const hasStorage = !!storageData.filteringModeDetails;
      const hasScripts = scripts.some(s => s.id === 'css-specific' || s.id === 'css-generic');
      if (hasStorage && hasScripts) {
        break;
      }
      await new Promise(r => setTimeout(r, interval));
      elapsed += interval;
    }
  });

  // Ensure the test ruleset is enabled in DNR
  await serviceWorker.evaluate(async () => {
    const enabled = await chrome.declarativeNetRequest.getEnabledRulesets();
    if (!enabled.includes('test')) {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        enableRulesetIds: ['test'],
      });
    }
  });

  // Close any tabs opened during install (e.g., update page)
  const pages = context.pages();
  for (const page of pages) {
    const url = page.url();
    if (url !== 'about:blank' && !url.startsWith('http://127.0.0.1:9876')) {
      await page.close();
    }
  }

  return { context, extensionId, serviceWorker };
}
