const fs = require('fs');
const path = require('path');
const http = require('http');
const chromeLauncher = require('chrome-launcher');
const puppeteer = require('puppeteer');

let lighthouse;

const root = path.join(__dirname, '..', '..');
const categoryData = JSON.parse(fs.readFileSync(path.join(root,'assets/data/categories.json'),'utf8'));
function startServer() {
  return new Promise(res => {
    const server = http.createServer((req, resp) => {
      const reqPath = req.url.split('?')[0];
      let filePath = path.join(root, reqPath);
      if (!fs.existsSync(filePath)) {
        if (reqPath.startsWith('/c/')) {
          const slug = reqPath.split('/')[2] || '';
          const exists = categoryData.some(c=>c.slug===slug);
          filePath = path.join(root, exists ? 'c/index.html' : '404.html');
        } else if (reqPath.startsWith('/p/')) {
          filePath = path.join(root, 'p/index.html');
        } else {
          filePath = path.join(root, '404.html');
        }
      }
      if (fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html');
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
async function runLh(url){
  lighthouse ??= (await import('lighthouse')).default;
  const chrome = await chromeLauncher.launch({chromeFlags:['--headless', '--no-sandbox'], chromePath: puppeteer.executablePath()});
  const result = await lighthouse(url,{port:chrome.port, output:'json',logLevel:'error',emulatedFormFactor:'desktop'});
  await chrome.kill();
  return result.lhr;
}
(async()=>{
  const {server, port} = await startServer();
  const base = `http://localhost:${port}`;
  const categories = JSON.parse(fs.readFileSync(path.join(root,'assets/data/categories.json'),'utf8'));
  const products = JSON.parse(fs.readFileSync(path.join(root,'assets/data/products.json'),'utf8'));
  const urls = [
    {name:'home', url:`${base}/`},
    {name:'category', url:`${base}/c/${categories[0].slug}/`},
    {name:'product', url:`${base}/p/${products[0].slug}`},
    {name:'missing-category', url:`${base}/c/not-a-real-category/`, skipBudget:true}
  ];
  const lines=[]; let failed=false;
  for (const u of urls){
    const lhr = await runLh(u.url);
    const cls = lhr.audits['cumulative-layout-shift']?.numericValue ?? 0;
    const lcp = lhr.audits['largest-contentful-paint']?.numericValue ?? 0;
    const seo = (lhr.categories.seo?.score ?? 0) * 100;
    const acc = (lhr.categories.accessibility?.score ?? 0) * 100;
    lines.push(`${u.name}: CLS ${cls.toFixed(3)}, LCP ${(lcp/1000).toFixed(2)}s, SEO ${seo.toFixed(0)}, Acc ${acc.toFixed(0)}`);
    if (!u.skipBudget && (cls>0.06 || lcp>2500 || seo<90 || acc<90)) failed=true;
    if (u.name==='missing-category'){
      const browser = await puppeteer.launch({args:['--no-sandbox']});
      const page = await browser.newPage();
      await page.goto(u.url, {waitUntil:'networkidle0'});
      const has404 = await page.evaluate(()=>/Page not found|No products available yet\./.test(document.body.textContent));
      await browser.close();
      if (!has404) {failed=true; lines.push('missing-category page lacks 404 UI');}
    }
  }
  fs.writeFileSync(path.join(root,'lighthouse-report.json'), JSON.stringify(lines,null,2));
  console.log(lines.join('\n'));
  server.close();
  if (failed) process.exit(1);
})();
