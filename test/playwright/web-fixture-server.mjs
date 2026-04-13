/**
 * Tiny static responses for Playwright web smoke (E1–E2) and daily-word W1.
 * Mirrors key copy from app/(auth)/welcome.tsx and a minimal sign-in shell.
 */
import http from 'http';

const PORT = parseInt(process.env.PLAYWRIGHT_WEB_FIXTURE_PORT || '8091', 10);

const INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><title>One Word A Day</title></head>
<body>
  <div class="content">
    <p class="emoji">📚</p>
    <h1>One Word A Day</h1>
    <p>Expand your vocabulary, one word at a time</p>
    <button type="button">Get Started</button>
    <button type="button">Sign In</button>
  </div>
</body>
</html>`;

const SIGNIN_HTML = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><title>Sign In</title></head>
<body>
  <h1>Sign In</h1>
  <p>Use your email to continue.</p>
</body>
</html>`;

const server = http.createServer((req, res) => {
  const path = req.url?.split('?')[0] || '/';

  if (req.method === 'GET' && path === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }

  if (req.method === 'GET' && (path === '/' || path === '')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(INDEX_HTML);
    return;
  }

  if (req.method === 'GET' && path === '/signin') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(SIGNIN_HTML);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.error(`[web-fixture] listening on http://127.0.0.1:${PORT}`);
});
