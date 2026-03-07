import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  timeout: 30000,
  retries: 1,
  workers: 1,
  reporter: 'html',
  globalSetup: './global-setup.js',
  globalTeardown: './global-teardown.js',
  use: {
    baseURL: 'http://127.0.0.1:9876',
  },
  expect: {
    timeout: 10000,
  },
});
