import { execSync } from 'child_process';

export default async function globalSetup() {
  console.log('Building extension...');
  execSync('pnpm run build', {
    stdio: 'inherit',
  });
}
