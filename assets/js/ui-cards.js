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
  },
  loadMoreClick(listName = 'Listing') {
    fireEvent('load_more_click', { item_list_name: listName });
  }
};

// toast helper
export } catch (_) {}
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

// Renders a uniform, clickable simpleCart card for a product.
export function buildProductCard(prod) { const CART_DEBUG=(window.CART_DEBUG!==undefined)?!!window.CART_DEBUG:true; function clog(){ if(!CART_DEBUG) return; try{ const a=[...arguments]; a[0]='[UICards] '+a[0]; console.log.apply(console,a);}catch(_){} }
  if (!prod || !prod.name || !prod.slug) {
    console.warn('Invalid product skipped', prod);
    return null;
  }
  const img = (prod.images && prod.images[0]) || '/assets/img/products/fallback.png';
  const priceNum = normalizePrice(prod.price);
  const compareNum = normalizePrice(prod.compareAtPrice ?? prod.price?.old);
  const currency = (prod.price && prod.price.currency) || prod.currency || 'PKR';

  const wrap = document.createElement('div');
  wrap.className = 'product-card';

  let priceHTML = '';
  if (priceNum !== null) {
    priceHTML = `<span class="visually-hidden item_price">${priceNum}</span><span aria-hidden="true" class="price-current">${StorefrontRuntime.formatPrice(priceNum, currency)}</span>`;
    if (compareNum !== null && compareNum > priceNum) {
      const pct = Math.round((1 - priceNum / compareNum) * 100);
      priceHTML += ` <span class="price-compare">${StorefrontRuntime.formatPrice(compareNum, currency)}</span> <span class="price-discount">${pct}% off</span>`;
    }
  } else {
    priceHTML = `<span class="visually-hidden item_price"></span><span aria-hidden="true" class="price-current">Unavailable</span>`;
  }

  const disabled = priceNum === null || prod.inStock === false;
  const actionHTML = disabled
    ? `<a href="/p/${prod.slug}" class="btn btn-secondary mt-auto" aria-label="View details for ${prod.name}">View details</a>`
    : `<button class="btn btn-primary mt-auto item_add" type="button" aria-label="Add ${prod.name} to cart">Add to Cart</button>`;

  const ratingHTML = prod.rating
    ? `<div class="rating mb-1" aria-label="Rated ${prod.rating} out of 5">${'★'.repeat(Math.round(prod.rating))}${'☆'.repeat(5 - Math.round(prod.rating))} <span class="text-muted small">(${prod.ratingCount || 0})</span></div>`
    : '';

  wrap.innerHTML = `
    <div class="card h-100 simpleCart_shelfItem">
      <a href="/p/${prod.slug}" class="text-decoration-none text-dark">
        <img src="${img}" class="card-img-top item_image item_thumb" alt="${prod.name}" loading="lazy" decoding="async" onerror="this.src='/assets/img/products/fallback.png'" width="300" height="375" srcset="${img} 300w, ${img} 600w" sizes="(max-width: 600px) 100vw, 300px">
      </a>
      <div class="card-body p-2 d-flex flex-column">
        <span class="visually-hidden item_id">${prod.id || prod.slug}</span>
        <span class="visually-hidden item_url">/p/${prod.slug}</span>
        <div class="mb-1">${StorefrontRuntime.renderProductBadgesHTML(prod) || ''}</div>
        ${prod.brand ? `<p class="brand mb-1 small text-muted">${prod.brand}</p>` : ''}
        <a href="/p/${prod.slug}" class="card-title h6 text-decoration-none text-dark item_name">${prod.name}</a>
        ${prod.variant ? `<p class="variant text-muted mb-1">${prod.variant}</p>` : ''}
        ${ratingHTML}
        <p class="card-text price-block mb-1">${priceHTML}</p>
        ${actionHTML}
      </div>
    </div>`;

  if (!disabled) {
    const btn = wrap.querySelector('.item_add');
    btn.addEventListener('click', () => { clog('inline card atc click', {id: prod && (prod.id||prod.slug)});
      const detail = { qty: 1, skipSimpleCart: true };
      const id = prod.id || prod.slug;
      if (id) detail.id = id;
      const evt = new CustomEvent('product:addToCart', { detail, bubbles: true });
      btn.dispatchEvent(evt);
      Analytics.addToCart(prod, 1);
      });
  }
  wrap.querySelectorAll('a[href^="/p/"]').forEach(a => {
    a.addEventListener('click', () => Analytics.selectItem(prod));
  });
  return wrap;
}

// expose helpers globally
window.Analytics = Analytics;
window.showAddedToast = showAddedToast;

// --- appended modern product card integration ---
// Override buildProductCard to use ProductCard component
buildProductCard = function(prod){
  if (!prod || !prod.name || !prod.slug) {
    console.warn('Invalid product skipped', prod);
    return null;
  }
  const tmp = document.createElement('template');
  tmp.innerHTML = window.ProductCard.renderProductCard(prod).trim();
  const el = tmp.content.firstElementChild;
  if(!el) return null;

  // analytics: product selection
  const link = el.querySelector('.pc__link');
  link?.addEventListener('click', () => Analytics.selectItem(prod));

  // cart and analytics on add to cart
  const priceNum = normalizePrice(prod.price);
  el.addEventListener('product:addToCart', (evt) => {
    const detail = evt?.detail || {};
    const qty = Number(detail.qty) || 1;
    const skipSimpleCart = !!detail.skipSimpleCart;
    try{
      if(!skipSimpleCart && typeof simpleCart !== 'undefined' && priceNum !== null){
        simpleCart.add({
          id: prod.id || prod.slug,
          name: prod.name,
          price: priceNum,
          image: (prod.images && prod.images[0]) || prod.image || '',
          quantity: qty
        });
      }
    }catch(e){ console.warn('cart error', e); }
    Analytics.addToCart(prod, qty);
    });
  return el;
};
