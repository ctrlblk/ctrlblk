import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  timeout: 30000,
  retries: 1,
  workers: 1,
  // In CI, also print each test, so a red run names the failing one.
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'html',
  globalSetup: './global-setup.js',
  globalTeardown: './global-teardown.js',
  use: {
    baseURL: 'http://127.0.0.1:9876',
  },
  expect: {
    timeout: 10000,
  },
});
