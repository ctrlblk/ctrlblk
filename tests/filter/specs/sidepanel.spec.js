import { test, expect } from '../helpers/fixtures.js';

const SITE = 'http://127.0.0.1:9876/blocking.html';

function extensionIdOf(serviceWorker) {
  return serviceWorker.url().split('/')[2];
}

/**
 * Open the side panel in a tab of its own, with a test-server page as the
 * active tab, as it is when the panel sits next to a website.
 * Returns { panel, site, errors }.
 */
async function openSidePanel(context, page, serviceWorker) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`console: ${msg.text()}`);
    }
  });

  const site = await context.newPage();
  await site.goto(SITE);
  await site.bringToFront();

  await page.goto(`chrome-extension://${extensionIdOf(serviceWorker)}/src/sidepanel/index.html`);
  await expect(page.getByRole('heading', { name: 'Filter lists' })).toBeVisible();

  return { panel: page, site, errors };
}

function sendMessage(panel, key, args = []) {
  return panel.evaluate(
    ([key, args]) => chrome.runtime.sendMessage({ key, args }),
    [key, args],
  );
}

function enabledRulesets(serviceWorker) {
  return serviceWorker.evaluate(() => chrome.declarativeNetRequest.getEnabledRulesets());
}

function groupHeader(panel, groupName) {
  return panel.getByRole('button', { name: new RegExp(`^${groupName}`) });
}

test.describe('Side panel', () => {
  test('renders and is styled', async ({ extensionContext, extensionPage, serviceWorker }) => {
    const { panel, site, errors } = await openSidePanel(extensionContext, extensionPage, serviceWorker);
    try {
      await expect(panel.getByRole('heading', { name: /Pause blocking on/ })).toBeVisible();
      await expect(panel.getByRole('heading', { name: 'Exceptions' })).toBeVisible();
      await expect(panel.getByRole('heading', { name: 'Filter lists' })).toBeVisible();
      await expect(panel.getByText('No exceptions')).toBeVisible();

      const styles = await panel.evaluate(() => {
        const card = document.querySelector('h4').closest('div[class*="rounded"]');
        const probe = document.createElement('div');
        probe.style.color = 'var(--color-primary-700)';
        document.body.appendChild(probe);
        const primary700 = getComputedStyle(probe).color;
        probe.remove();
        return {
          cardRadius: card ? getComputedStyle(card).borderTopLeftRadius : '0px',
          primary700,
        };
      });
      // The stylesheet is loaded and Tailwind ran over it
      expect(styles.cardRadius).not.toBe('0px');
      // The custom primary palette is zinc (#3f3f46 is zinc-700)
      expect(styles.primary700).toBe('rgb(63, 63, 70)');

      expect(errors).toEqual([]);
    } finally {
      await site.close();
    }
  });

  test('filter list checkboxes match the enabled rulesets', async ({ extensionContext, extensionPage, serviceWorker }) => {
    const { panel, site } = await openSidePanel(extensionContext, extensionPage, serviceWorker);
    try {
      const details = await sendMessage(panel, 'getFilterlistDetails');
      const enabled = await enabledRulesets(serviceWorker);
      expect(enabled).toEqual(expect.arrayContaining(['default', 'ctrlblk']));

      for (const groupName of ['Default', 'Annoyances', 'Miscellaneous', 'Regional']) {
        await groupHeader(panel, groupName).click();

        let checked = 0;
        for (const [id, ruleset] of details) {
          const checkbox = panel.getByRole('checkbox', { name: ruleset.name, exact: true });
          if (!(await checkbox.isVisible())) {
            continue;
          }
          if (enabled.includes(id)) {
            await expect(checkbox, `${id} should be checked`).toBeChecked();
            checked++;
          } else {
            await expect(checkbox, `${id} should be unchecked`).not.toBeChecked();
          }
        }

        if (groupName === 'Default') {
          expect(checked).toBe(2);
        }
      }
    } finally {
      await site.close();
    }
  });

  test('toggling a filter list updates the header and the rulesets', async ({ extensionContext, extensionPage, serviceWorker }) => {
    const { panel, site } = await openSidePanel(extensionContext, extensionPage, serviceWorker);
    const listName = 'Ads, trackers, miners, and more';
    try {
      const header = groupHeader(panel, 'Default');
      await expect(header).toContainText(listName);
      await header.click();

      const checkbox = panel.getByRole('checkbox', { name: listName, exact: true });
      await expect(checkbox).toBeChecked();

      await checkbox.click();
      await expect(checkbox).not.toBeChecked();
      await expect(header).not.toContainText(listName);
      await expect(header).toContainText('CtrlBlock filters');
      await expect.poll(() => enabledRulesets(serviceWorker)).not.toContain('default');

      await checkbox.click();
      await expect(checkbox).toBeChecked();
      await expect(header).toContainText(listName);
      await expect.poll(() => enabledRulesets(serviceWorker)).toContain('default');
    } finally {
      await sendMessage(panel, 'enableFilterlist', ['default']);
      await site.close();
    }
  });

  test('pause, search and remove an exception', async ({ extensionContext, extensionPage, serviceWorker }) => {
    const { panel, site } = await openSidePanel(extensionContext, extensionPage, serviceWorker);
    const hostname = '127.0.0.1';
    const exceptionCell = panel.getByRole('cell', { name: hostname, exact: true });
    try {
      await expect(panel.getByRole('heading', { name: `Pause blocking on ${hostname}?` })).toBeVisible();

      await panel.locator('button:has(svg.w-10)').click();

      await expect(panel.getByRole('heading', { name: `Restart blocking on ${hostname}?` })).toBeVisible();
      await expect(exceptionCell).toBeVisible();
      await expect.poll(() => sendMessage(panel, 'getExceptions')).toContain(hostname);

      const search = panel.getByPlaceholder('Search by domain');
      await search.fill('zzz');
      await expect(panel.getByText('No exceptions')).toBeVisible();
      await expect(exceptionCell).toBeHidden();

      await search.fill('');
      await expect(exceptionCell).toBeVisible();

      await panel.getByRole('row', { name: hostname }).getByRole('button').click();
      await expect(panel.getByText('No exceptions')).toBeVisible();
      await expect(panel.getByRole('heading', { name: `Pause blocking on ${hostname}?` })).toBeVisible();
      await expect.poll(() => sendMessage(panel, 'getExceptions')).not.toContain(hostname);
    } finally {
      await sendMessage(panel, 'removeException', [hostname]);
      await site.close();
    }
  });
});
