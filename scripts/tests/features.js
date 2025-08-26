const fs = require('fs');
const path = require('path');
const http = require('http');
const puppeteer = require('puppeteer');

const root = path.join(__dirname, '..', '..');
function startServer(){
  return new Promise(res=>{
    const server = http.createServer((req, resp)=>{
      const reqPath = req.url.split('?')[0];
      let filePath = path.join(root, reqPath);
      if (!fs.existsSync(filePath)) {
        if (reqPath.startsWith('/c/')) filePath = path.join(root,'c/index.html');
        else if (reqPath.startsWith('/p/')) filePath = path.join(root,'p/index.html');
        else filePath = path.join(root,'404.html');
      }
      if (fs.statSync(filePath).isDirectory()) filePath = path.join(filePath,'index.html');
      fs.readFile(filePath,(err,data)=>{
        if(err){ resp.statusCode=404; resp.end('not found'); return; }
        const ext = path.extname(filePath).toLowerCase();
        const type = ext==='.html'?'text/html':ext==='.js'?'application/javascript':ext==='.json'?'application/json':undefined;
        if(type) resp.setHeader('Content-Type', type);
        resp.end(data);
      });
    }).listen(0,()=>{ const {port}=server.address(); res({server,port}); });
  });
}

(async()=>{
  const {server, port} = await startServer();
  const browser = await puppeteer.launch({args:['--no-sandbox']});
  const page = await browser.newPage();
  const products = JSON.parse(fs.readFileSync(path.join(root,'assets/data/products.json'),'utf8'));
  const first = products[0];
  const second = products[1];
  const brand = first.brand || 'test';
  const catSlug = (first.categories && first.categories[0]) || null;
  const report = [];
  let failed = false;
  let pdata;

  // search snapshots
  await page.goto(`http://localhost:${port}/search/?q=${encodeURIComponent(brand)}`,{waitUntil:'networkidle0'});
  let data = await page.evaluate(()=>({
    h1: document.getElementById('search-heading')?.textContent || '',
    cards: document.querySelectorAll('#search-grid .card').length,
    canonical: document.querySelector('link[rel="canonical"]')?.href || null,
    robots: document.querySelector('meta[name="robots"]')?.content || null
  }));
  if (!data.h1.includes(brand)) {failed=true; report.push('Search heading missing brand');}
  if (data.cards < 1) {failed=true; report.push('Search results missing cards');}
  if (data.canonical) {failed=true; report.push('Search page should not have canonical');}
  if (data.robots !== 'noindex, follow') {failed=true; report.push('Search page robots tag incorrect');}

  await page.goto(`http://localhost:${port}/search/?q=nonsense`,{waitUntil:'networkidle0'});
  data = await page.evaluate(()=>({
    empty: document.getElementById('search-empty')?.textContent || '',
    status: document.title
  }));
  if (!/No products found/i.test(data.empty)) {failed=true; report.push('Search empty state missing');}

  // autocomplete product suggestions
  await page.goto(`http://localhost:${port}/`,{waitUntil:'networkidle0'});
  await page.waitForSelector('#header-search');
  await page.focus('#header-search');
  let panel = await page.$('#site-search-results:not(.d-none)');
  if (panel) {failed=true; report.push('Suggestions visible before typing');}
  const prefix = first.name.slice(0,3);
  await page.type('#header-search', prefix);
  await page.waitForSelector('#site-search-results:not(.d-none)',{timeout:10000});
  const sugg = await page.$$eval('#site-search-results .search-option.product', els => els.length);
  if (sugg < 1) {failed=true; report.push('Product suggestions missing');}
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForNavigation({waitUntil:'networkidle0'});
  const title = await page.$eval('.pdp__title', el=>el.textContent);
  if (!title.includes(first.name)) {failed=true; report.push('Autocomplete navigation failed');}

  // recently viewed
  await page.goto(`http://localhost:${port}/p/${first.slug}`,{waitUntil:'networkidle0'});
  await page.goto(`http://localhost:${port}/p/${second.slug}`,{waitUntil:'networkidle0'});
  await page.goto(`http://localhost:${port}/`,{waitUntil:'networkidle0'});
  const recentCount = await page.evaluate(()=>{
    const sec=document.getElementById('recently-viewed-home');
    const items=document.querySelectorAll('#recently-viewed-home-row .card').length;
    return sec && !sec.classList.contains('d-none') ? items : 0;
  });
  if (recentCount < 2) {failed=true; report.push('Recently viewed section missing');}

  // badges
  await page.goto(`http://localhost:${port}/search/?q=blossom`,{waitUntil:'networkidle0'});
  const hasBadge = await page.evaluate(()=>Array.from(document.querySelectorAll('#search-grid .badge')).some(b=>/Out of stock/i.test(b.textContent)));
  if (!hasBadge) {failed=true; report.push('Out of stock badge missing');}

  // category page card checks
  if (catSlug){
    await page.goto(`http://localhost:${port}/c/${catSlug}/`,{waitUntil:'networkidle0'});
    let pdata = await page.evaluate(()=>{
      const grid = document.getElementById('product-grid');
      const cards = Array.from(grid?.querySelectorAll('.simpleCart_shelfItem')||[]);
      const priceRe = /^\d+(\.\d{1,2})?$/;
      const ok = cards.length>0 && cards.every(c=>{
        const name = c.querySelector('.item_name');
        const price = c.querySelector('.item_price');
        const btn = c.querySelector('.item_add[aria-label]');
        const links = c.querySelectorAll('a[href^="/p/"]');
        return name && name.textContent.trim().length>0 && price && priceRe.test(price.textContent.trim()) && btn && links.length>=2;
      });
      return {grid: !!grid, ok, count: cards.length};
    });
    if (!pdata.grid || !pdata.ok) {failed=true; report.push('Category page cards incomplete');}
  }

  // product detail simpleCart hooks
  await page.goto(`http://localhost:${port}/p/${first.slug}`,{waitUntil:'networkidle0'});
  pdata = await page.evaluate(()=>{
    const price = document.querySelector('.simpleCart_shelfItem .item_price');
    const qty = document.querySelector('.simpleCart_shelfItem .item_Quantity');
    const btn = document.querySelector('.simpleCart_shelfItem .item_add[aria-label]');
    const priceRe = /^\d+(\.\d{1,2})?$/;
    return {
      name: !!document.querySelector('.simpleCart_shelfItem .item_name'),
      price: price && priceRe.test(price.textContent.trim()),
      qty: qty && qty.getAttribute('min')==='1',
      add: !!btn
    };
  });
  if (!pdata.name || !pdata.price || !pdata.qty || !pdata.add) {failed=true; report.push('Product page missing cart hooks');}

  // analytics noop
  const analyticsNoop = await page.evaluate(()=>{
    delete window.gtag;
    try { window.Analytics.addToCart({id:'x',slug:'x',name:'Test',price:1},1); return true; } catch(e){ return false; }
  });
  if (!analyticsNoop) {failed=true; report.push('Analytics threw without gtag');}

  await browser.close();
  server.close();
  if (!report.length) report.push('All feature checks passed');
  fs.writeFileSync(path.join(root,'feature-report.txt'), report.join('\n'));
  console.log(report.join('\n'));
  if (failed) process.exit(1);
})();
