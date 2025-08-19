document.addEventListener('DOMContentLoaded', async () => {
  try {
    const products = await StorefrontRuntime.loadProducts();
    const grid = document.getElementById('product-grid');
    products.forEach(prod => {
      const col = document.createElement('div');
      col.className = 'col-6 col-md-4 col-lg-3 mb-4';
      col.innerHTML = `
        <div class="card h-100 simpleCart_shelfItem">
          <a href="/p/${prod.slug}" class="text-decoration-none text-dark">
            <img src="${prod.images[0]}" class="card-img-top item_thumb" alt="${prod.name}" loading="lazy" width="300" height="300" style="object-fit:cover;aspect-ratio:1/1;">
          </a>
          <div class="card-body p-2 d-flex flex-column">
            <div class="mb-1">${StorefrontRuntime.renderProductBadgesHTML(prod)}</div>
            <a href="/p/${prod.slug}" class="card-title h6 text-decoration-none text-dark item_name">${prod.name}</a>
            <p class="card-text mb-1 item_price">${StorefrontRuntime.formatPrice(prod.price, prod.currency)}</p>
            <button class="btn btn-primary mt-auto item_add" type="button">Add to Cart</button>
          </div>
        </div>`;
      grid.appendChild(col);
    });
  } catch (e) {
    console.error(e);
    const container = document.querySelector('.container');
    if (container) {
      container.innerHTML = `<div class="alert alert-danger">Error loading products. <button class="btn btn-link p-0" onclick="location.reload()">Retry</button></div>`;
    }
  }
});
