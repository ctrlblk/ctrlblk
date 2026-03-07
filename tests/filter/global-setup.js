import { execSync } from 'child_process';
import { startServer } from './helpers/test-server.js';

export default async function globalSetup() {
  // Build the extension with test filters enabled
  console.log('Building extension with --filter-test...');
  execSync('pnpm run build -- --filter-test', {
    stdio: 'inherit',
  });

  // Start the test server
  console.log('Starting test server on port 9876...');
  const server = await startServer();
  globalThis.__TEST_SERVER__ = server;
}
