#!/usr/bin/env node
/*
 * normalize-products.js
 *
 * Fills in fields that data-entry people shouldn't have to type, so the
 * Pages CMS form can stay minimal:
 *
 *   - slug: generated from the product name when left blank (kept unique).
 *   - id:   set to the slug when left blank.
 *   - price.currency: forced to "PKR".
 *   - inStock: defaults to true when missing.
 *
 * It NEVER changes a slug or id that already has a value, so a product's web
 * address (/p/<slug>) stays stable once it exists.
 *
 * The script is idempotent: running it a second time makes no changes and
 * writes nothing — that's what stops the auto-commit workflow from looping.
 *
 * Run: node scripts/normalize-products.js
 * Exits 0 always (whether or not it changed the file); prints what it did.
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'assets', 'data', 'products.json');

function slugify(str) {
  return String(str || '')
    .normalize('NFKD')                 // decompose accents (é -> e + mark)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')       // anything not a-z0-9 (incl. marks) -> hyphen
    .replace(/-{2,}/g, '-')            // collapse repeats
    .replace(/^-+|-+$/g, '');          // trim leading/trailing hyphens
}

function isBlank(v) {
  return v === undefined || v === null || String(v).trim() === '';
}

const products = JSON.parse(fs.readFileSync(FILE, 'utf8'));

// Collect slugs already in use so generated ones don't collide.
const usedSlugs = new Set(
  products.map((p) => (isBlank(p.slug) ? '' : String(p.slug).trim())).filter(Boolean)
);

function uniqueSlug(base) {
  const root = base || 'product';
  let candidate = root;
  let n = 2;
  while (usedSlugs.has(candidate)) {
    candidate = `${root}-${n}`;
    n += 1;
  }
  usedSlugs.add(candidate);
  return candidate;
}

let changed = false;
for (const p of products) {
  if (isBlank(p.slug)) {
    p.slug = uniqueSlug(slugify(p.name));
    changed = true;
  }
  if (isBlank(p.id)) {
    p.id = p.slug;
    changed = true;
  }
  if (!p.price || typeof p.price !== 'object') {
    p.price = { current: 0, currency: 'PKR' };
    changed = true;
  } else if (p.price.currency !== 'PKR') {
    p.price.currency = 'PKR';
    changed = true;
  }
  if (typeof p.inStock !== 'boolean') {
    p.inStock = true;
    changed = true;
  }
}

if (changed) {
  fs.writeFileSync(FILE, JSON.stringify(products, null, 2) + '\n');
  console.log('normalize-products: filled in missing slug/id/currency/inStock');
} else {
  console.log('normalize-products: nothing to do');
}
