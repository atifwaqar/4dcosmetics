const CART_DEBUG = (window.CART_DEBUG !== undefined) ? !!window.CART_DEBUG : true;

function log() {
  if (!CART_DEBUG) return;
  var a = Array.prototype.slice.call(arguments);
  a.unshift('[ProductCard]');
  console.log.apply(console, a);
}

const ITEM_CACHE = {};

window.ProductCard = {
  renderProductCard(item) {
    if (!item) return '';
    ITEM_CACHE[item.id] = item;
    return `
      <div class="product-card" data-id="${item.id}">
        <img src="${item.image}" alt="${item.title}">
        <h3>${item.title}</h3>
        <p>${item.price?.formatted || ''}</p>
        <button class="add-to-cart" data-id="${item.id}">Add to cart</button>
      </div>
    `;
  },

  bindEvents() {
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('.add-to-cart');
      if (!btn) return;
      const id = btn.dataset.id;
      const item = ITEM_CACHE[id];
      if (!item) {
        warn('No item found for', id);
        return;
      }
      log('Add to cart clicked', item);
      document.dispatchEvent(new CustomEvent('product:addToCart', {
        detail: { id: item.id, qty: 1 }
      }));
    });
  }
};

// Unified addToCart event listener
document.addEventListener('product:addToCart', function (e) {
  log('event product:addToCart', e.detail);

  const detail = e.detail || {};
  const id = String(detail.id || '');
  const qty = Math.max(1, Number(detail.qty) || 1);
  const item = ITEM_CACHE[id];

  if (!item) {
    log('No item found in ITEM_CACHE for id', id);
    return;
  }

  try {
    if (typeof simpleCart !== 'undefined') {
      const priceNum = Number(item.price && item.price.value ? item.price.value : item.price) || 0;
      simpleCart.add({
        id: id,
        name: item.title || id,
        price: priceNum,
        image: item.image || '',
        quantity: qty
      });
    }
  } catch (err) {
    console.warn('Cart error (product-card listener)', err);
  }
});

document.addEventListener('DOMContentLoaded', function () {
  window.ProductCard.bindEvents();
});
