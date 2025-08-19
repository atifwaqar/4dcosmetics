import { buildProductCard } from './ui-cards.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await StorefrontRuntime.loadProducts();
    const grid = document.getElementById('products-grid');
    const count = document.getElementById('product-count');

    const all = StorefrontRuntime.getAllProducts();
    grid.innerHTML = '';
    all.forEach(p => grid.appendChild(buildProductCard(p)));
    if (count) count.textContent = `${all.length} products`;
  } catch (e) {
    console.error(e);
    const grid = document.getElementById('products-grid');
    if (grid) grid.innerHTML = `<div class="alert alert-danger">Failed to load products.</div>`;
  }
});
