// Web önizlemesini sunar; bilinmeyen adresler index.html'e düşer (tek sayfa uygulama).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const [kok, port] = process.argv.slice(2);
const turler = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf', '.ico': 'image/x-icon' };

createServer(async (istek, cevap) => {
  const yol = decodeURIComponent(new URL(istek.url, 'http://x').pathname);
  for (const aday of [join(kok, yol), join(kok, yol, 'index.html'), join(kok, `${yol}.html`), join(kok, 'index.html')]) {
    try {
      const veri = await readFile(aday);
      cevap.writeHead(200, { 'content-type': turler[extname(aday)] ?? 'application/octet-stream' });
      return cevap.end(veri);
    } catch {
      // sıradaki aday
    }
  }
  cevap.writeHead(404).end();
}).listen(Number(port));
