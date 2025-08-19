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
        if (err) { resp.statusCode = 404; resp.end('Not found'); return; }
        const ext = path.extname(filePath).toLowerCase();
        const type = ext === '.html' ? 'text/html' : ext === '.js' ? 'application/javascript' : ext === '.json' ? 'application/json' : undefined;
        if (type) resp.setHeader('Content-Type', type);
        resp.end(data);
      });
    }).listen(0, () => {
      const {port} = server.address();
      res({server, port});
    });
  });
}

(async () => {
  const {server, port} = await startServer();
  const browser = await puppeteer.launch({args:['--no-sandbox']});
  const page = await browser.newPage();
  const categories = JSON.parse(fs.readFileSync(path.join(root,'assets/data/categories.json'),'utf8'));
  const products = JSON.parse(fs.readFileSync(path.join(root,'assets/data/products.json'),'utf8'));
  const report = [];
  let failed = false;

  // category with image (simulate)
  const catWithImage = categories[0];
  await page.setRequestInterception(true);
  page.on('request', req => {
    if (req.url().endsWith('/assets/data/categories.json')) {
      const mod = categories.map(c => c.slug===catWithImage.slug ? {...c, image:'https://example.com/test.jpg'} : c);
      req.respond({status:200, contentType:'application/json', body: JSON.stringify(mod)});
    } else {
      req.continue();
    }
  });
  await page.goto(`http://localhost:${port}/c/${catWithImage.slug}/`,{waitUntil:'networkidle0'});
  let data = await page.evaluate(() => ({
    title: document.title,
    canonical: document.querySelector('link[rel="canonical"]').href,
    ogImage: document.querySelector('meta[property="og:image"]')?.content || null,
    ld: document.getElementById('ld-json').textContent
  }));
  if (!data.ogImage) {failed=true; report.push('Category with image missing og:image');}
  const ldCat = JSON.parse(data.ld);
  if (ldCat['@type'] !== 'BreadcrumbList') {failed=true; report.push('Category breadcrumb missing');}
  page.removeAllListeners('request');
  await page.setRequestInterception(false);

  // category without image
  const catNoImage = categories[1];
  await page.goto(`http://localhost:${port}/c/${catNoImage.slug}/`,{waitUntil:'networkidle0'});
  data = await page.evaluate(() => ({
    canonical: document.querySelector('link[rel="canonical"]').href,
    ogImage: document.querySelector('meta[property="og:image"]')?.content || null
  }));
  if (data.ogImage) {failed=true; report.push('Category without image has og:image');}

  // product with images
  const prodWithImage = products[0];
  await page.goto(`http://localhost:${port}/p/${prodWithImage.slug}`,{waitUntil:'networkidle0'});
  data = await page.evaluate(() => ({
    ogImage: document.querySelector('meta[property="og:image"]')?.content || null,
    ld: document.getElementById('ld-json').textContent
  }));
  const ldProd = JSON.parse(data.ld); // array
  const prodSchema = ldProd.find(i => i['@type']==='Product');
  if (!data.ogImage) {failed=true; report.push('Product with images missing og:image');}
  if (!prodSchema || !prodSchema.offers) {failed=true; report.push('Product schema missing offers');}

  // product without images (simulate)
  const prodNoImage = products[1];
  await page.setRequestInterception(true);
  page.on('request', req => {
    if (req.url().endsWith('/assets/data/products.json')) {
      const mod = products.map(p => p.slug===prodNoImage.slug ? {...p, images: []} : p);
      req.respond({status:200, contentType:'application/json', body: JSON.stringify(mod)});
    } else req.continue();
  });
  await page.goto(`http://localhost:${port}/p/${prodNoImage.slug}`,{waitUntil:'networkidle0'});
  data = await page.evaluate(() => ({
    ogImage: document.querySelector('meta[property="og:image"]')?.content || null,
    ld: document.getElementById('ld-json').textContent
  }));
  const ldProd2 = JSON.parse(data.ld); const prodSchema2 = ldProd2.find(i=>i['@type']==='Product');
  if (data.ogImage) {failed=true; report.push('Product without images has og:image');}
  if (prodSchema2.image) {failed=true; report.push('Product schema unexpectedly has image');}

  await browser.close();
  server.close();
  if (!report.length) report.push('All meta/JSON-LD snapshot checks passed');
  fs.writeFileSync(path.join(root,'meta-jsonld-report.txt'), report.join('\n'));
  console.log(report.join('\n'));
  if (failed) process.exit(1);
})();
