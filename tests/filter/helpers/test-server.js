import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, '..', 'fixtures', 'pages');

export function startServer(port = 9876) {
  const app = express();

  // Serve static test pages
  app.use(express.static(fixturesDir));

  // Simulated ad resources
  // 1x1 transparent PNG
  const pixel = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAB' +
    'Nl7BcQAAAABJRU5ErkJggg==',
    'base64'
  );

  app.get('/ads/full-path.png', (req, res) => {
    res.type('image/png').send(pixel);
  });

  app.get('/ads/tracker.js', (req, res) => {
    res.type('application/javascript').send('window.__ad_loaded = true;');
  });

  app.get('/ads/redirect-target.js', (req, res) => {
    res.type('application/javascript').send('window.__redirect_target_executed = true;');
  });

  // Partial path test resources
  app.get('/testfiles/blocking/partial-path/:file', (req, res) => {
    res.type('image/png').send(pixel);
  });

  // Wildcard test resources
  app.get('/testfiles/blocking/wildcard/:dir/target.png', (req, res) => {
    res.type('image/png').send(pixel);
  });

  // Mixed resources for exception tests
  app.get('/mixed/blocked.js', (req, res) => {
    res.type('application/javascript').send('window.__blocked_loaded = true;');
  });

  app.get('/mixed/allowed.js', (req, res) => {
    res.type('application/javascript').send('window.__allowed_loaded = true;');
  });

  // Safe resources (never blocked)
  app.get('/safe/:file', (req, res) => {
    res.type('image/png').send(pixel);
  });

  // Dynamic image test resources ($image type)
  app.get('/testfiles/image/dynamic/:file', (req, res) => {
    res.type('image/png').send(pixel);
  });

  // XHR blocking test endpoint ($xmlhttprequest type)
  app.get('/testfiles/xhr/ad-data', (req, res) => {
    res.json({ ad: true });
  });

  // Subdocument test endpoint
  app.get('/testfiles/subdocument/frame.html', (req, res) => {
    res.type('html').send('<!DOCTYPE html><html><body><div id="subdoc-loaded">Subdocument loaded</div></body></html>');
  });

  // Exception image test resources
  app.get('/testfiles/image/exception/blocked.png', (req, res) => {
    res.type('image/png').send(pixel);
  });

  app.get('/testfiles/image/exception/allowed.png', (req, res) => {
    res.type('image/png').send(pixel);
  });

  // Stylesheet blocking test endpoint ($stylesheet)
  app.get('/testfiles/css/ad-styles.css', (req, res) => {
    res.type('text/css').send('body { --ad-css-loaded: 1; }');
  });

  // Font blocking test endpoint ($font)
  app.get('/testfiles/font/ad-font.woff2', (req, res) => {
    // Minimal valid WOFF2 header (empty font)
    res.type('font/woff2').send(Buffer.alloc(16));
  });

  // Media blocking test endpoint ($media)
  app.get('/testfiles/media/ad-video.mp4', (req, res) => {
    res.type('video/mp4').send(Buffer.alloc(16));
  });

  // Redirect test endpoints (Issue 17)
  app.get('/ads/redirect-target-img.png', (req, res) => {
    res.type('image/png').send(pixel);
  });

  app.get('/ads/redirect-target.css', (req, res) => {
    res.type('text/css').send('.redirect-css-marker { --redirect-loaded: 1; }');
  });

  // Safe resources that should NOT be blocked (Issue 22 negative tests)
  app.get('/testfiles/safe/legit-style.css', (req, res) => {
    res.type('text/css').send('.safe-style { --safe-loaded: 1; }');
  });

  app.get('/testfiles/safe/legit.png', (req, res) => {
    res.type('image/png').send(pixel);
  });

  // Removeparam test endpoint — echoes the received query params
  app.get('/content/article', (req, res) => {
    res.json({ params: req.query });
  });

  return new Promise((resolve) => {
    const server = app.listen(port, '127.0.0.1', () => {
      console.log(`Test server listening on http://127.0.0.1:${port}`);
      resolve(server);
    });
  });
}
