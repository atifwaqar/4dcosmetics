// Currency configuration for the shop.
// Use `var` and guard against existing globals so the script can be
// included multiple times without throwing "Identifier has already been
// declared" errors.
var SHOP_CURRENCY = window.SHOP_CURRENCY || 'PKR';
var SHOP_CURRENCY_SYMBOL = window.SHOP_CURRENCY_SYMBOL || '₨';
// Persist values on the `window` object for other scripts.
window.SHOP_CURRENCY = SHOP_CURRENCY;
window.SHOP_CURRENCY_SYMBOL = SHOP_CURRENCY_SYMBOL;

// Register Pakistani Rupee currency before configuring simpleCart
simpleCart.currency({
  code: SHOP_CURRENCY,
  name: 'Pakistani Rupee',
  symbol: SHOP_CURRENCY_SYMBOL
});

// ── Single source of truth for cart writes ────────────────────────────────
// Every "add to cart" across the site (product cards, PDP, search) routes
// through Cart.add, so there is exactly one place that touches simpleCart.
// The mini-cart drawer opens by listening to simpleCart's afterAdd event
// (see cart-drawer.js), so callers only need to add the item — they must not
// open the drawer themselves.
window.Cart = window.Cart || {
  add: function (item) {
    if (!item || typeof simpleCart === 'undefined') return false;
    var price = item.price;
    if (price && typeof price === 'object') price = price.current;
    try {
      simpleCart.add({
        id: item.id || item.slug,
        name: item.name || item.title || '',
        price: Number(price) || 0,
        image: item.image || (item.images && item.images[0]) || '',
        quantity: Number(item.quantity || item.qty) || 1
      });
      return true;
    } catch (e) {
      console.warn('Cart.add error', e);
      return false;
    }
  }
};

// ── Single source of truth for the wishlist ───────────────────────────────
// Product cards, the PDP, and the wishlist page all read/write the wishlist
// through this one module (localStorage key wishlist_ids_v1).
window.Wishlist = window.Wishlist || (function () {
  var KEY = 'wishlist_ids_v1';
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
  function save(arr) { try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch (e) {} }
  return {
    list: load,
    has: function (id) { return load().includes(String(id)); },
    toggle: function (id) {
      var s = String(id), arr = load();
      if (arr.includes(s)) arr = arr.filter(function (x) { return x !== s; }); else arr.push(s);
      save(arr);
      return arr.includes(s);
    }
  };
})();

// ── Single analytics dispatch wrapper ─────────────────────────────────────
// One place that talks to gtag / dataLayer. The Analytics helpers in
// ui-cards.js and the search events in search-autocomplete.js both route
// through this, so the gtag/dataLayer plumbing is not duplicated.
window.track = window.track || function (type, data) {
  data = data || {};
  try {
    if (window.gtag) window.gtag('event', type, data);
    else if (window.dataLayer) window.dataLayer.push(Object.assign({ event: type }, data));
  } catch (e) { console.warn('analytics error', e); }
};

// ── App updates: service worker + "Update available" banner ───────────────
// Registers the network-first service worker (sw.js) so online visitors always
// get the latest code and the site works offline. When a new version is
// deployed (sw.js VERSION bumped), a small non-intrusive banner invites the
// customer to refresh into the new version.
(function () {
  if (!('serviceWorker' in navigator)) return;

  function showUpdateBanner(applyUpdate) {
    if (document.getElementById('app-update-banner')) return;
    if (!document.body) { document.addEventListener('DOMContentLoaded', function () { showUpdateBanner(applyUpdate); }, { once: true }); return; }
    var style = document.getElementById('app-update-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'app-update-style';
      style.textContent =
        '#app-update-banner{position:fixed;left:50%;transform:translateX(-50%);bottom:16px;z-index:2147483000;' +
        'background:#111;color:#fff;border-radius:12px;padding:10px 12px 10px 16px;display:flex;gap:12px;align-items:center;' +
        'box-shadow:0 8px 28px rgba(0,0,0,.28);font:500 14px/1.25 Inter,system-ui,Arial,sans-serif;max-width:92vw}' +
        '#app-update-banner button{border:0;border-radius:8px;padding:8px 12px;font-weight:600;cursor:pointer;font-size:14px}' +
        '#app-update-banner .au-refresh{background:#fff;color:#111}' +
        '#app-update-banner .au-later{background:transparent;color:#bbb}';
      document.head.appendChild(style);
    }
    var bar = document.createElement('div');
    bar.id = 'app-update-banner';
    bar.setAttribute('role', 'status');
    bar.setAttribute('aria-live', 'polite');
    var msg = document.createElement('span');
    msg.textContent = 'A new version of the site is available.';
    var refresh = document.createElement('button');
    refresh.className = 'au-refresh';
    refresh.textContent = 'Refresh';
    refresh.onclick = function () { refresh.disabled = true; applyUpdate(); };
    var later = document.createElement('button');
    later.className = 'au-later';
    later.textContent = 'Later';
    later.onclick = function () { bar.remove(); };
    bar.appendChild(msg); bar.appendChild(refresh); bar.appendChild(later);
    document.body.appendChild(bar);
  }

  var updateAccepted = false; // set when the customer taps Refresh

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').then(function (reg) {
      function offerUpdate(worker) {
        showUpdateBanner(function () {
          updateAccepted = true;
          (worker || reg.waiting).postMessage({ type: 'SKIP_WAITING' });
        });
      }
      // A worker is already waiting from a previous visit.
      if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
      // A new worker starts installing while the page is open.
      reg.addEventListener('updatefound', function () {
        var nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', function () {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(nw);
        });
      });
      // Check for a new version now and whenever the tab regains focus.
      try { reg.update(); } catch (e) {}
      document.addEventListener('visibilitychange', function () {
        if (!document.hidden) { try { reg.update(); } catch (e) {} }
      });
    }).catch(function () {});

    // When the new worker takes control AFTER the customer accepted the update,
    // reload once to run the fresh code. (Ignore the first-visit claim, which
    // also fires controllerchange but should not reload the page.)
    var reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (reloaded || !updateAccepted) return;
      reloaded = true;
      window.location.reload();
    });
  });
})();

$(function() {
  // Initialize simpleCart
  simpleCart({
    cartColumns: [
      { attr: "name", label: "Product" },
      { attr: "price", label: "Price", view: 'currency' },
      { view: "decrement", label: false, text: "-" },
      { attr: "quantity", label: "Qty" },
      { view: "increment", label: false, text: "+" },
      { attr: "total", label: "SubTotal", view: 'currency' },
      { view: "remove", text: "Remove", label: false }
    ],
    cartStyle: "div",
    currency: SHOP_CURRENCY
  });

  // Populate order form with cart data
  $('#order-form').on('submit', function() {
    var items = [];
    simpleCart.each(function(item){
      items.push({name: item.get('name'), price: item.get('price'), quantity: item.get('quantity')});
    });
    $('#order').val(JSON.stringify(items));
  });

  // Animate cart count when items are added
  simpleCart.bind('afterAdd', function() {
    var $qty = $('.simpleCart_quantity');
    $qty.addClass('cart-bounce');
    setTimeout(function() {
      $qty.removeClass('cart-bounce');
    }, 400);
  });
});

(function ensureCartDrawerScript(){
  function resolveCartDrawerSrc(){
    try {
      var current = Array.prototype.slice.call(document.scripts || [])
        .find(function(scr){ return scr && scr.src && scr.src.indexOf('config.js') !== -1; });
      if (current){
        var raw = current.getAttribute('src');
        if (raw){
          var replaced = raw.replace(/config\.js(?:\?.*)?$/,'cart-drawer.js');
          if (replaced !== raw) return replaced;
        }
        var url = new URL(current.src, window.location.href);
        return url.origin + url.pathname.replace(/config\.js$/, 'cart-drawer.js');
      }
    }catch(_){ }
    return '/assets/js/cart-drawer.js';
  }

  function loadCartDrawer(){
    if (window.CartDrawer || window.__CART_DRAWER_LOADING__) return;
    window.__CART_DRAWER_LOADING__ = true;
    var script = document.createElement('script');
    script.src = resolveCartDrawerSrc();
    script.async = true;
    script.dataset.cartDrawerAutoload = '1';
    script.onload = script.onerror = function(){ window.__CART_DRAWER_LOADING__ = false; };
    (document.head || document.documentElement || document.body).appendChild(script);
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', loadCartDrawer, { once: true });
  }else{
    loadCartDrawer();
  }
})();
