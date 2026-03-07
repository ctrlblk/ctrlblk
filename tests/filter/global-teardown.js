export default async function globalTeardown() {
  if (globalThis.__TEST_SERVER__) {
    await new Promise((resolve) => {
      globalThis.__TEST_SERVER__.close(resolve);
    });
    console.log('Test server stopped.');
  }
}
