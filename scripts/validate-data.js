const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');

function readJSON(relPath) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8'));
}

const ajv = new Ajv({allErrors: true});
const categories = readJSON('assets/data/categories.json');
const products = readJSON('assets/data/products.json');
const catSchema = readJSON('assets/schemas/categories.schema.json');
const prodSchema = readJSON('assets/schemas/products.schema.json');

const validateCat = ajv.compile(catSchema);
const validateProd = ajv.compile(prodSchema);

let errors = [];
if (!validateCat(categories)) {
  errors.push(...validateCat.errors.map(e => `categories ${ajv.errorsText([e])}`));
}
if (!validateProd(products)) {
  errors.push(...validateProd.errors.map(e => `products ${ajv.errorsText([e])}`));
}

const categorySlugs = new Set();
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
categories.forEach((cat, idx) => {
  if (cat.slug !== cat.slug.trim()) errors.push(`categories[${idx}] slug has surrounding whitespace`);
  if (!slugPattern.test(cat.slug)) errors.push(`categories[${idx}] slug not kebab-case`);
  if (categorySlugs.has(cat.slug)) errors.push(`duplicate category slug '${cat.slug}'`);
  categorySlugs.add(cat.slug);
});

const productSlugs = new Set();
products.forEach((prod, idx) => {
  if (prod.slug !== prod.slug.trim()) errors.push(`products[${idx}] slug has surrounding whitespace`);
  if (!slugPattern.test(prod.slug)) errors.push(`products[${idx}] slug not kebab-case`);
  if (productSlugs.has(prod.slug)) errors.push(`duplicate product slug '${prod.slug}'`);
  productSlugs.add(prod.slug);
  if (typeof prod.price !== 'number') errors.push(`product '${prod.slug}' price not numeric`);
  if (!/^[A-Z]{3}$/.test(prod.currency)) errors.push(`product '${prod.slug}' currency invalid`);
  if (prod.brand && typeof prod.brand !== 'string') errors.push(`product '${prod.slug}' brand must be string`);
  if (prod.sku && typeof prod.sku !== 'string') errors.push(`product '${prod.slug}' sku must be string`);
  if (prod.tags && !Array.isArray(prod.tags)) {
    errors.push(`product '${prod.slug}' tags must be array`);
  } else if (Array.isArray(prod.tags)) {
    prod.tags.forEach((t, ti) => {
      if (typeof t !== 'string') errors.push(`product '${prod.slug}' tags[${ti}] not string`);
    });
  }
  prod.categories.forEach(slug => {
    if (!categorySlugs.has(slug)) errors.push(`product '${prod.slug}' references missing category '${slug}'`);
  });
});

const summary = `Checked ${categories.length} categories and ${products.length} products`;
if (errors.length) {
  console.error('Data validation failed:');
  errors.forEach(e => console.error(' - ' + e));
  console.error(summary);
  process.exit(1);
} else {
  console.log('Data validation passed');
  console.log(summary);
}
