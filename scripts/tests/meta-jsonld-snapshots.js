const fs = require('fs');
const path = require('path');
const http = require('http');
const puppeteer = require('puppeteer');

const root = path.join(__dirname, '..', '..');
function startServer() {
  return new Promise(res => {
    const server = http.createServer((req, resp) => {
      const reqPath = req.url.split('?')[0];
      let filePath = path.join(root, reqPath);
      if (!fs.existsSync(filePath)) {
        if (reqPath.startsWith('/c/')) filePath = path.join(root, 'c/index.html');
        else if (reqPath.startsWith('/p/')) filePath = path.join(root, 'p/index.html');
        else filePath = path.join(root, '404.html');
      }
      if (fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html');
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
  const catSlugs = new Set(categories.map(c=>c.slug));
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
    canonical: document.querySelector('link[rel="canonical"]')?.href || null,
    ogImage: document.querySelector('meta[property="og:image"]')?.content || null,
    ld: document.getElementById('ld-json')?.textContent || ''
  }));
  if (!data.ogImage) {report.push('Category with image missing og:image');}
  const ldCat = data.ld ? JSON.parse(data.ld) : [];
  const breadcrumbOk = Array.isArray(ldCat)
    ? ldCat.some(i => i['@type'] === 'BreadcrumbList')
    : ldCat['@type'] === 'BreadcrumbList';
  if (!breadcrumbOk) {report.push('Category breadcrumb missing');}
  page.removeAllListeners('request');
  await page.setRequestInterception(false);

  // category without image
  const catNoImage = categories[1];
  await page.goto(`http://localhost:${port}/c/${catNoImage.slug}/`,{waitUntil:'networkidle0'});
  data = await page.evaluate(() => ({
    canonical: document.querySelector('link[rel="canonical"]')?.href || null,
    ogImage: document.querySelector('meta[property="og:image"]')?.content || null
  }));
  if (data.ogImage) {failed=true; report.push('Category without image has og:image');}

  // product with images
  const prodWithImage = products[0];
  await page.goto(`http://localhost:${port}/p/${prodWithImage.slug}`,{waitUntil:'networkidle0'});
  data = await page.evaluate(() => ({
    ogImage: document.querySelector('meta[property="og:image"]')?.content || null,
    ld: document.getElementById('ld-json')?.textContent || ''
  }));
  const ldProd = data.ld ? JSON.parse(data.ld) : [];
  const prodSchema = ldProd.find(i => i['@type']==='Product');
  if (!data.ogImage) {report.push('Product with images missing og:image');}
  if (!prodSchema || !prodSchema.offers) {report.push('Product schema missing offers');}

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
    ld: document.getElementById('ld-json')?.textContent || ''
  }));
  const ldProd2 = data.ld ? JSON.parse(data.ld) : [];
  const prodSchema2 = ldProd2.find(i=>i['@type']==='Product');
  if (data.ogImage) {failed=true; report.push('Product without images has og:image');}
  if (prodSchema2 && prodSchema2.image) {failed=true; report.push('Product schema unexpectedly has image');}
  page.removeAllListeners('request');
  await page.setRequestInterception(false);

  // filtered category snapshot
  const filteredUrl = `http://localhost:${port}/c/${categories[0].slug}/?brand=${encodeURIComponent(products[0].brand)}&inStock=true&priceMin=10&sort=price_desc&page=2`;
  await page.goto(filteredUrl,{waitUntil:'networkidle0'});
  data = await page.evaluate(() => ({
    canonical: document.querySelector('link[rel="canonical"]')?.href || '',
    total: document.getElementById('product-grid')?.dataset.total,
    gridCount: document.querySelectorAll('#product-grid > div').length,
    empty: document.getElementById('product-grid')?.textContent.includes('No products match your filters.') || false,
    pages: document.querySelectorAll('#pagination .page-item').length
  }));
  if (!data.canonical) {report.push('Filtered category missing canonical');}
  else if (data.canonical.includes('?')) {failed=true; report.push('Filtered category canonical has query params');}
  if (!data.empty && data.gridCount === 0) {report.push('Filtered category missing grid');}
  const expectedPages = Math.ceil((parseInt(data.total,10)||0)/12);
  if ((expectedPages<=1 && data.pages!==0) || (expectedPages>1 && data.pages!==(expectedPages+2))) {
    failed=true; report.push('Filtered category pagination mismatch');
  }

  // deep-link test
  const deepLinkUrl = `http://localhost:${port}/c/${categories[0].slug}/?brand=${encodeURIComponent(products[0].brand)}`;
  await page.goto(deepLinkUrl,{waitUntil:'networkidle0'});
  const deepChecked = await page.evaluate((brand)=>{
    const cb = document.querySelector(`input[name="brand"][value="${brand}"]`);
    return cb ? cb.checked : false;
  }, products[0].brand);
  if (!deepChecked) {report.push('Deep-link filter not pre-selected');}

  // categories page link crawl
  await page.goto(`http://localhost:${port}/categories/`,{waitUntil:'networkidle0'});
  const links = await page.$$eval('#all-categories > div > a', els => els.map(a => a.getAttribute('href')));
  if (links.length !== categories.filter(c=>!c.parent).length) {failed=true; report.push('Categories page tile count mismatch');}
  links.forEach(href => {
    const slug = href.split('/')[2];
    if (!catSlugs.has(slug)) {failed=true; report.push(`Categories page has invalid link ${href}`);}
  });

  await browser.close();
  server.close();
  if (!report.length) report.push('All meta/JSON-LD snapshot checks passed');
  fs.writeFileSync(path.join(root,'meta-jsonld-report.txt'), report.join('\n'));
  console.log(report.join('\n'));
  if (failed) process.exit(1);
})();
