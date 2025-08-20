// Simple analytics helpers. Exported so other modules can use and also
// attached to the window object for non-module scripts.
function fireEvent(type, data) {
  try {
    if (window.gtag) {
      window.gtag('event', type, data);
    } else if (window.dataLayer) {
      window.dataLayer.push({ event: type, ecommerce: data });
    }
  } catch (e) {
    console.warn('analytics error', e);
  }
}

export const Analytics = {
  viewItemList(products, listName = 'Listing') {
    const items = products.map((p, idx) => ({
      item_id: p.id || p.slug,
      item_name: p.name,
      index: idx + 1
    }));
    fireEvent('view_item_list', { item_list_name: listName, items });
  },
  selectItem(prod) {
    fireEvent('select_item', { items: [{ item_id: prod.id || prod.slug, item_name: prod.name }] });
  },
  addToCart(prod, qty) {
    fireEvent('add_to_cart', { items: [{ item_id: prod.id || prod.slug, item_name: prod.name, price: prod.price, quantity: qty }] });
  },
  heroClick(target) {
    fireEvent('hero_click', { target });
  },
  categoryClick(cat) {
    fireEvent('category_click', { items: [{ item_id: cat.id || cat.slug, item_name: cat.name }] });
  },
  newsletterSignup() {
    fireEvent('sign_up', { method: 'homepage_newsletter' });
  }
};

// toast helper
export function showAddedToast(name) {
  const toast = document.createElement('div');
  toast.className = 'toast-notice position-fixed bottom-0 end-0 m-3 p-2 bg-dark text-white rounded';
  toast.style.zIndex = '1055';
  toast.innerHTML = `Added ${name} — <a href="/cart.html" class="text-white text-decoration-underline">View cart</a>`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Normalize price to a number. Returns null if invalid.
export function normalizePrice(val) {
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}

// Renders a uniform, clickable simpleCart card for a product.
export function buildProductCard(prod) {
  if (!prod || !prod.name || !prod.slug) {
    console.warn('Invalid product skipped', prod);
    return null;
  }
  const img = (prod.images && prod.images[0]) || '/assets/img/products/fallback.png';
  const priceNum = normalizePrice(prod.price);
  const currency = prod.currency || 'USD';

  const col = document.createElement('div');
  col.className = 'col-6 col-md-4 col-lg-3 mb-4';

  const priceHTML = priceNum !== null
    ? `<span class="visually-hidden item_price">${priceNum}</span><span aria-hidden="true" class="price-ui">${StorefrontRuntime.formatPrice(priceNum, currency)}</span>`
    : `<span class="visually-hidden item_price"></span><span aria-hidden="true" class="price-ui">Unavailable</span>`;

  const disabled = priceNum === null ? 'disabled' : '';
  const btnLabel = priceNum === null ? 'Unavailable' : 'Add to Cart';

  col.innerHTML = `
    <div class="card h-100 simpleCart_shelfItem">
      <a href="/p/${prod.slug}" class="text-decoration-none text-dark">
        <img src="${img}" class="card-img-top item_image item_thumb" alt="${prod.name}" loading="lazy" decoding="async" onerror="this.src='/assets/img/products/fallback.png'" width="300" height="300" style="object-fit:cover;aspect-ratio:1/1;" srcset="${img} 300w, ${img} 600w" sizes="(max-width: 600px) 100vw, 300px">
      </a>
      <div class="card-body p-2 d-flex flex-column">
        <span class="visually-hidden item_id">${prod.id || prod.slug}</span>
        <span class="visually-hidden item_url">/p/${prod.slug}</span>
        <div class="mb-1">${StorefrontRuntime.renderProductBadgesHTML(prod) || ''}</div>
        <a href="/p/${prod.slug}" class="card-title h6 text-decoration-none text-dark item_name">${prod.name}</a>
        <p class="card-text mb-1">${priceHTML}</p>
        <button class="btn btn-primary mt-auto item_add" type="button" aria-label="Add ${prod.name} to cart" ${disabled}>${btnLabel}</button>
      </div>
    </div>`;

  const btn = col.querySelector('.item_add');
  if (priceNum !== null) {
    btn.addEventListener('click', () => {
      Analytics.addToCart(prod, 1);
      showAddedToast(prod.name);
    });
  }
  col.querySelectorAll('a[href^="/p/"]').forEach(a => {
    a.addEventListener('click', () => Analytics.selectItem(prod));
  });
  return col;
}

// expose helpers globally
window.Analytics = Analytics;
window.showAddedToast = showAddedToast;
