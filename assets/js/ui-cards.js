// Simple analytics helpers. Exported so other modules can use and also
// attached to the window object for non-module scripts.
// Delegates to the single analytics dispatch wrapper (config.js).
function fireEvent(type, data) { window.track(type, data); }

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
  },
  loadMoreClick(listName = 'Listing') {
    fireEvent('load_more_click', { item_list_name: listName });
  }
};

// toast helper
export function showAddedToast(name) {
  const trigger = document.activeElement;
  try {
    if (window.CartDrawer && typeof window.CartDrawer.open === 'function') {
      window.CartDrawer.open(trigger);
      return;
    }
  } catch (_) {}
  try {
    window.__CART_DRAWER_WANTS_OPEN__ = {
      trigger: trigger && typeof trigger.focus === 'function' ? trigger : null
    };
  } catch (_) {}
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
  if (val && typeof val === 'object') val = val.current;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}

// Build a product card element by delegating to the single ProductCard
// renderer (the only card renderer in the codebase). Returns a DOM element so
// search-page.js can appendChild it. The add-to-cart click is handled once by
// the document-level delegated handler in product-card.js (Cart.add + drawer);
// here we only attach analytics.
export function buildProductCard(prod) {
  if (!prod || !prod.name || !prod.slug) {
    console.warn('Invalid product skipped', prod);
    return null;
  }
  const tmp = document.createElement('template');
  tmp.innerHTML = window.ProductCard.renderProductCard(prod).trim();
  const el = tmp.content.firstElementChild;
  if (!el) return null;
  el.querySelector('.pc__link')?.addEventListener('click', () => Analytics.selectItem(prod));
  el.addEventListener('product:addToCart', (evt) => Analytics.addToCart(prod, Number(evt?.detail?.qty) || 1));
  return el;
}

// expose helpers globally
window.Analytics = Analytics;
window.showAddedToast = showAddedToast;
