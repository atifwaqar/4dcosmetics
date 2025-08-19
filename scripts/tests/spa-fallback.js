const fs = require('fs');
const path = require('path');
const http = require('http');
const puppeteer = require('puppeteer');

const root = path.join(__dirname, '..', '..');
function startServer() {
  return new Promise(res => {
    const server = http.createServer((req, resp) => {
      let filePath = path.join(root, req.url.split('?')[0]);
      if (filePath.endsWith('/')) filePath += 'index.html';
      fs.readFile(filePath, (err, data) => {
        if (err) { resp.statusCode=404; resp.end('Not found'); return; }
        const ext = path.extname(filePath).toLowerCase();
        const type = ext === '.html' ? 'text/html' : ext === '.js' ? 'application/javascript' : ext === '.json' ? 'application/json' : undefined;
        if (type) resp.setHeader('Content-Type', type);
        resp.end(data);
      });
    }).listen(0, ()=>{res({server, port: server.address().port});});
  });
}

(async () => {
  const {server, port} = await startServer();
  const base = `http://localhost:${port}`;
  const browser = await puppeteer.launch({args:['--no-sandbox']});
  const page = await browser.newPage();
  const lines = [];
  let failed = false;

  try {
    await page.goto(`${base}/c/makeup/`, {waitUntil:'networkidle0'});
    const catH1 = await page.$eval('#category-title', el=>el.textContent.trim());
    if (catH1 !== 'Makeup') {failed=true; lines.push('Category direct load failed');}
    await page.reload({waitUntil:'networkidle0'});
    const catH1b = await page.$eval('#category-title', el=>el.textContent.trim());
    if (catH1b !== 'Makeup') {failed=true; lines.push('Category refresh failed');}

    await page.goto(`${base}/p/velvet-matte-lipstick`, {waitUntil:'networkidle0'});
    const prodH1 = await page.$eval('#product-title', el=>el.textContent.trim());
    if (prodH1 !== 'Velvet Matte Lipstick') {failed=true; lines.push('Product direct load failed');}

    await page.goto(`${base}/c/makeup/?page=2`, {waitUntil:'networkidle0'});
    const canon = await page.$eval('link[rel="canonical"]', el=>el.href);
    if (!canon.endsWith('/c/makeup/')) {failed=true; lines.push('Canonical not normalized');}

    await page.goto(`${base}/c/not-a-real/`, {waitUntil:'networkidle0'});
    const notFound = await page.evaluate(()=>document.body.textContent.includes('Category not found'));
    if (!notFound) {failed=true; lines.push('Missing 404 UI');}
    const topCats = await page.$$eval('a[href^="/c/"]', a=>a.length);
    if (!topCats) {failed=true; lines.push('Top categories missing on 404');}

    await page.goto(`${base}/c/makeup/`, {waitUntil:'networkidle0'});
    const sheetOk = await page.evaluate(()=>document.styleSheets.length>0);
    if (!sheetOk) {failed=true; lines.push('Stylesheets failed on deep link');}
  } catch (e) {
    failed=true; lines.push('Exception: '+e.message);
  }

  await browser.close();
  server.close();
  if (!lines.length) lines.push('SPA fallback tests passed');
  fs.writeFileSync(path.join(root,'spa-fallback-log.txt'), lines.join('\n'));
  console.log(lines.join('\n'));
  if (failed) process.exit(1);
})();
