import { chromium } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const extensionPath = join(__dirname, '..', '..', '..', 'dist');

/**
 * Launch Chromium with the given extra args, in new headless mode unless
 * `headless` is false. Playwright's default headless shell can't load
 * extensions; the `chromium` channel can. Videos must autoplay without a
 * user gesture, or YouTube's player never starts when headless.
 */
function launchChromium({ headless, args }) {
  return chromium.launchPersistentContext('', {
    headless,
    channel: 'chromium',
    args: [
      ...args,
      '--no-first-run',
      '--disable-gpu',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });
}

/**
 * Launch Chromium without any extension, for checking what YouTube serves
 * when nothing blocks it. Returns the browser context.
 */
export function launchBrowserWithoutExtension({ headless = true } = {}) {
  return launchChromium({ headless, args: [] });
}

/**
 * Launch Chromium with the CtrlBlk extension loaded.
 * Returns { context, extensionId, serviceWorker }.
 */
export async function launchBrowserWithExtension({ headless = true } = {}) {
  const context = await launchChromium({
    headless,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  let serviceWorker;
  if (context.serviceWorkers().length > 0) {
    serviceWorker = context.serviceWorkers()[0];
  } else {
    serviceWorker = await context.waitForEvent('serviceworker');
  }

  const extensionId = serviceWorker.url().split('/')[2];

  // Wait for the extension to fully initialize
  await serviceWorker.evaluate(async () => {
    const maxWait = 30000;
    const interval = 500;
    let elapsed = 0;
    while (elapsed < maxWait) {
      const [localData, sessionData, scripts] = await Promise.all([
        chrome.storage.local.get('filteringModeDetails'),
        chrome.storage.session.get('filteringModeDetails'),
        chrome.scripting.getRegisteredContentScripts(),
      ]);
      const hasStorage = !!(localData.filteringModeDetails || sessionData.filteringModeDetails);
      const hasScripts = scripts.some(s => s.id === 'css-specific' || s.id === 'css-generic');
      if (hasStorage && hasScripts) {
        break;
      }
      await new Promise(r => setTimeout(r, interval));
      elapsed += interval;
    }
  });

  // Close any tabs opened during install (e.g., update page)
  const pages = context.pages();
  for (const page of pages) {
    const url = page.url();
    if (url !== 'about:blank') {
      await page.close();
    }
  }

  return { context, extensionId, serviceWorker };
}
