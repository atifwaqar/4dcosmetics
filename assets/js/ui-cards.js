// Renders a uniform, clickable simpleCart card for a product.
export function buildProductCard(prod) {
  // Defensive fallbacks
  const img = (prod.images && prod.images[0]) || '/assets/img/products/fallback.png';
  const price = prod.price; // numeric preferred
  const currency = prod.currency || 'USD';

  const col = document.createElement('div');
  col.className = 'col-6 col-md-4 col-lg-3 mb-4';

  col.innerHTML = `
    <div class="card h-100 simpleCart_shelfItem">
      <a href="/p/${prod.slug}" class="text-decoration-none text-dark">
        <img src="${img}" class="card-img-top item_thumb" alt="${prod.name}" loading="lazy" width="300" height="300" style="object-fit:cover;aspect-ratio:1/1;">
      </a>
      <div class="card-body p-2 d-flex flex-column">
        <div class="mb-1">${StorefrontRuntime.renderProductBadgesHTML(prod) || ''}</div>
        <a href="/p/${prod.slug}" class="card-title h6 text-decoration-none text-dark item_name">${prod.name}</a>
        <p class="card-text mb-1">
          <span class="item_price" data-currency="${currency}">${StorefrontRuntime.formatPrice(price, currency)}</span>
        </p>
        <button class="btn btn-primary mt-auto item_add" type="button">Add to Cart</button>
      </div>
    </div>`;
  return col;
}
