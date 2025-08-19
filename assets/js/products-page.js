import { buildProductCard, Analytics } from './ui-cards.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await StorefrontRuntime.loadProducts();
    const grid = document.getElementById('products-grid');
    const count = document.getElementById('product-count');

    const all = StorefrontRuntime.getAllProducts();
    grid.innerHTML = '';
    const rendered = [];
    all.forEach(p => {
      const card = buildProductCard(p);
      if (card) { grid.appendChild(card); rendered.push(p); }
    });
    if (count) count.textContent = `${rendered.length} products`;
    Analytics.viewItemList(rendered, 'All Products');
    const ld = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "itemListElement": rendered.map((p,i)=>({"@type":"ListItem","position":i+1,"url":`${window.location.origin}/p/${p.slug}`}))
    };
    const ldEl = document.getElementById('ld-json');
    if (ldEl) ldEl.textContent = JSON.stringify(ld);
  } catch (e) {
    console.error(e);
    const grid = document.getElementById('products-grid');
    if (grid) grid.innerHTML = `<div class="alert alert-danger">Failed to load products.</div>`;
  }
});
