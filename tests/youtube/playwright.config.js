import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  timeout: 60000,
  retries: 0,
  workers: 1,
  // In CI, also print each test, so a red run names the failing one.
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'html',
  globalSetup: './global-setup.js',
  expect: {
    timeout: 15000,
  },
});
