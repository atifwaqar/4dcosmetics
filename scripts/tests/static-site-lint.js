const fs = require('fs');
const path = require('path');
const {JSDOM} = require('jsdom');

const root = path.join(__dirname, '..', '..');
const reportLines = [];
let failed = false;

function readJSON(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
}
const categories = readJSON('assets/data/categories.json');
const products = readJSON('assets/data/products.json');
const catSlugs = new Set(categories.map(c => c.slug));
const prodSlugs = new Set(products.map(p => p.slug));
const dynamicPaths = new Set(['/account.html', '/wishlist.html', '/checkout.html']);

function walk(dir) {
  const res = [];
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) res.push(...walk(full));
    else if (entry.endsWith('.html')) res.push(full);
  }
  return res;
}

const htmlFiles = walk(root).filter(f => !f.includes('node_modules'));
const htmlErrors = [];
const linkErrors = [];
const imgErrors = [];

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const titles = doc.getElementsByTagName('title');
  if (titles.length !== 1) htmlErrors.push(`${path.relative(root,file)}: expected 1 <title>, found ${titles.length}`);
  const canonicals = doc.querySelectorAll('link[rel="canonical"]');
  if (canonicals.length > 1) htmlErrors.push(`${path.relative(root,file)}: more than one canonical link`);
  const ids = new Set();
  doc.querySelectorAll('[id]').forEach(el => {
    if (ids.has(el.id)) htmlErrors.push(`${path.relative(root,file)}: duplicate id '${el.id}'`);
    ids.add(el.id);
  });
  doc.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('mailto:')) return;
    const clean = href.split('#')[0].split('?')[0];
    if (clean.startsWith('/c/')) {
      const slug = clean.split('/')[2];
      if (!catSlugs.has(slug)) linkErrors.push(`${path.relative(root,file)}: unknown category link ${href}`);
    } else if (clean.startsWith('/p/')) {
      const slug = clean.split('/')[2];
      if (!prodSlugs.has(slug)) linkErrors.push(`${path.relative(root,file)}: unknown product link ${href}`);
    } else {
      if (dynamicPaths.has(clean)) return;
      const target = path.join(root, clean);
      if (!fs.existsSync(target)) linkErrors.push(`${path.relative(root,file)}: broken link ${href}`);
    }
  });
  doc.querySelectorAll('img').forEach(img => {
    if (!(img.getAttribute('width') && img.getAttribute('height'))) {
      const parent = img.parentElement;
      const style = parent ? parent.getAttribute('style') || '' : '';
      if (!/aspect-ratio/.test(style)) {
        imgErrors.push(`${path.relative(root,file)}: <img> missing dimensions`);
      }
    }
  });
}

if (htmlErrors.length) { reportLines.push('HTML sanity issues:'); htmlErrors.forEach(e => reportLines.push(' - '+e)); failed = true; }
if (linkErrors.length) { reportLines.push('Link issues:'); linkErrors.forEach(e => reportLines.push(' - '+e)); failed = true; }
if (imgErrors.length) { reportLines.push('Image dimension issues:'); imgErrors.forEach(e => reportLines.push(' - '+e)); failed = true; }
if (!failed) reportLines.push('All static checks passed');

const reportPath = path.join(root, 'static-lint-report.txt');
fs.writeFileSync(reportPath, reportLines.join('\n'));
console.log(fs.readFileSync(reportPath, 'utf8'));
if (failed) process.exit(1);
