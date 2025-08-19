const fs = require('fs');
const path = require('path');
const {XMLParser} = require('fast-xml-parser');

const root = path.join(__dirname, '..', '..');
function readJSON(rel, def){
  try {return JSON.parse(fs.readFileSync(path.join(root, rel),'utf8'));} catch(e){return def;}
}
const categories = readJSON('assets/data/categories.json', []);
const products = readJSON('assets/data/products.json', []);
const exclude = new Set(readJSON('assets/data/sitemap-exclude.json', []));
const expected = new Set();
expected.add('/categories/');
categories.forEach(c=>{ const p = `/c/${c.slug}/`; if(!exclude.has(p)) expected.add(p); });
products.forEach(p=>{ const u = `/p/${p.slug}`; if(!exclude.has(u)) expected.add(u); });

const xml = fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
const parser = new XMLParser();
const j = parser.parse(xml);
const sitemapPaths = new Set((j.urlset.url||[]).map(u => new URL(u.loc).pathname));
const missing = [...expected].filter(p=>!sitemapPaths.has(p));
const extra = [...sitemapPaths].filter(p=>!expected.has(p) && p !== '/');

const robots = fs.readFileSync(path.join(root,'robots.txt'),'utf8');
const hasRobotsLine = /Sitemap: https:\/\/4dcosmetics.com\/sitemap.xml/.test(robots);

const lines = [];
let failed = false;
if (missing.length) {lines.push('Missing URLs: '+missing.join(', ')); failed=true;}
if (extra.length) {lines.push('Unexpected URLs: '+extra.join(', ')); failed=true;}
if (!hasRobotsLine) {lines.push('robots.txt missing sitemap line'); failed=true;}
if (!lines.length) lines.push('Sitemap matches data files');
fs.writeFileSync(path.join(root,'sitemap-report.txt'), lines.join('\n'));
console.log(lines.join('\n'));
if (failed) process.exit(1);
