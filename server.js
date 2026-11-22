'use strict';
/**
 * TrailAtlas — standalone Node.js static/PWA server (zero npm dependencies).
 * Location data is intentionally stored in the browser and never sent here.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');
const publicDir = path.join(__dirname, 'public');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

function respond(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()');
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, {'Allow':'GET, HEAD'});
    res.end();
    return;
  }
  let pathname;
  try { pathname = new URL(req.url, 'http://localhost').pathname; }
  catch { res.writeHead(400); res.end(); return; }
  if (pathname === '/api/health') {
    res.writeHead(200, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
    res.end(req.method === 'HEAD' ? undefined : JSON.stringify({ok:true,app:'TrailAtlas',mode:'local-first',serverTime:new Date().toISOString()}));
    return;
  }
  if (pathname === '/') pathname = '/index.html';
  // Serve only known files in public/; never access project root or dotfiles.
  let decoded;
  try { decoded = decodeURIComponent(pathname); }
  catch { res.writeHead(400); res.end(); return; }
  if (decoded.includes('\0') || decoded.includes('\\') || decoded.split('/').some(s => s === '..' || s.startsWith('.'))) {
    res.writeHead(403); res.end(); return;
  }
  const filepath = path.resolve(publicDir, '.' + decoded);
  if (!(filepath.startsWith(publicDir + path.sep))) {res.writeHead(403); res.end(); return;}
  fs.stat(filepath, (err, stats) => {
    if (err || !stats.isFile()) {res.writeHead(404,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Not found'}));return;}
    const ext = path.extname(filepath).toLowerCase();
    const headers = {
      'Content-Type': mime[ext] || 'application/octet-stream',
      'Content-Length': stats.size,
      'Cache-Control': decoded === '/sw.js' ? 'no-store, must-revalidate' : decoded === '/index.html' ? 'no-cache' : 'public, max-age=86400'
    };
    res.writeHead(200, headers);
    if (req.method === 'HEAD') {res.end();return;}
    const stream = fs.createReadStream(filepath);
    stream.on('error', () => {res.destroy();});
    stream.pipe(res);
  });
}

const app = http.createServer(respond);
if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '0.0.0.0';
  app.listen(port, host, () => {
    console.log(`TrailAtlas running at http://localhost:${app.address().port}`);
    console.log('GPS works over localhost or HTTPS. Use HTTPS on remote phones.');
  });
  for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => app.close(() => process.exit(0)));
}
module.exports = app;
