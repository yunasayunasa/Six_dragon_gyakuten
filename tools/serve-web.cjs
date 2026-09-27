const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

const host = process.env.PAPERHD2D_HOST || '127.0.0.1';
const port = Number(process.env.PAPERHD2D_PORT || 8768);
const secure = Boolean(process.env.PAPERHD2D_TLS_CERT && process.env.PAPERHD2D_TLS_KEY);
const protocol = secure ? 'https' : 'http';
const root = path.resolve(__dirname, '../exports/web');
const allowed = new Set(['/', '/index.html', '/index.js', '/index.wasm', '/index.pck', '/index.png', '/index.audio.worklet.js', '/index.audio.position.worklet.js', '/connection']);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.wasm': 'application/wasm', '.pck': 'application/octet-stream', '.png': 'image/png' };

const handler = (request, response) => {
  const pathname = new URL(request.url, `${protocol}://${host}:${port}`).pathname;
  if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405); response.end(); return; }
  if (secure && pathname === '/iphone-ca.cer' && process.env.PAPERHD2D_CA_CERT) {
    const data = fs.readFileSync(process.env.PAPERHD2D_CA_CERT);
    response.writeHead(200, { 'Content-Type': 'application/x-x509-ca-cert',
      'Content-Disposition': 'attachment; filename="PaperHD2D-Local-CA.cer"',
      'Cache-Control': 'no-store', 'Content-Length': data.length });
    response.end(request.method === 'HEAD' ? undefined : data);
    return;
  }
  if (!allowed.has(pathname)) { response.writeHead(404); response.end(); return; }
  if (pathname === '/connection') {
    const ready = ['index.html', 'index.js', 'index.wasm', 'index.pck'].every(name => fs.existsSync(path.join(root, name)));
    const body = JSON.stringify({ ready, project: 'PaperHD2D', renderer: 'Compatibility', url: `${protocol}://${host}:${port}/` });
    response.writeHead(ready ? 200 : 503, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(body) });
    response.end(request.method === 'HEAD' ? undefined : body);
    return;
  }
  const name = pathname === '/' ? 'index.html' : pathname.slice(1);
  const file = path.join(root, name);
  const gz = file + '.gz';
  const useGzip = (name.endsWith('.wasm') || name.endsWith('.pck')) && request.headers['accept-encoding']?.includes('gzip') && fs.existsSync(gz);
  const selected = useGzip ? gz : file;
  fs.stat(selected, (error, stat) => {
    if (error || !stat.isFile()) { response.writeHead(404); response.end(); return; }
    const headers = { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Content-Length': stat.size, 'Cache-Control': name === 'index.html' ? 'no-store' : 'public, max-age=300', 'X-Content-Type-Options': 'nosniff' };
    if (useGzip) headers['Content-Encoding'] = 'gzip';
    response.writeHead(200, headers);
    if (request.method === 'HEAD') response.end(); else fs.createReadStream(selected).pipe(response);
  });
};
const server = secure
  ? https.createServer({ cert: fs.readFileSync(process.env.PAPERHD2D_TLS_CERT), key: fs.readFileSync(process.env.PAPERHD2D_TLS_KEY) }, handler)
  : http.createServer(handler);
server.listen(port, host, () => console.log(`PaperHD2D Web: ${protocol}://${host}:${port}/`));
