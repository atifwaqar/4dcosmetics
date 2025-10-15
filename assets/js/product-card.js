// exports: renderProductCard(item), formatPrice(number, currency)
(function(global){
  const CART_DEBUG = (window.CART_DEBUG !== undefined) ? !!window.CART_DEBUG : true;
  function log(){ if(!CART_DEBUG) return; try{ const a=[...arguments]; a[0]='[PC] '+a[0]; console.log.apply(console,a);}catch(_){} }

  const WISHLIST_KEY = 'wishlist_ids_v1';
  const ITEM_CACHE = {};

  function loadWishlist(){
    try{ return JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]'); }catch{ return []; }
  }
  function saveWishlist(arr){ localStorage.setItem(WISHLIST_KEY, JSON.stringify(arr)); }
  function inWishlist(id){ return loadWishlist().includes(String(id)); }
  function toggleWishlist(id){
    const idStr = String(id);
    let list = loadWishlist();
    if(list.includes(idStr)) list = list.filter(x=>x!==idStr); else list.push(idStr);
    saveWishlist(list);
    return list.includes(idStr);
  }

  function formatPrice(n){
    return moneyPKR(n);
  }

  function starsSVG(value){
    const v = Math.max(0, Math.min(5, Number(value)||0));
    const full = Math.floor(v);
    const half = v - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;

    const STAR_PATH = "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21 12 17.27z";

    const fullStar = `<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${STAR_PATH}"/></svg>`;
    const emptyStar = `<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="${STAR_PATH}"/></svg>`;
    const clipId = `halfClip-${Math.random().toString(36).slice(2)}`;
    const halfStar = `
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
    <defs>
      <clipPath id="${clipId}"><rect x="0" y="0" width="12" height="24"/></clipPath>
    </defs>
    <g clip-path="url(#${clipId})"><path fill="currentColor" d="${STAR_PATH}"/></g>
    <path fill="none" stroke="currentColor" stroke-width="2" d="${STAR_PATH}"/>
  </svg>`;

    return [
      ...Array(full).fill(fullStar),
      ...Array(half).fill(halfStar),
      ...Array(empty).fill(emptyStar)
    ].join('');
  }

  function renderProductCard(raw){
    // Accept multiple shapes; normalize to a single item schema
    const item = normalize(raw);
    ITEM_CACHE[item.id] = item;
    const FALLBACK_IMG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="%23f3f3f3"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="18">No image</text></svg>';
    const mainImg = item.image || FALLBACK_IMG;
    const imgAlt = item.image ? escapeHtml(item.image_alt || item.title) : 'No image available';

    const outOfStock = item.inStock === false;

    const badges = [];
    if(outOfStock) badges.push('<span class="pc-badge pc-badge--oos">Out of stock</span>');
    if(item.is_new) badges.push('<span class="pc-badge pc-badge--new">New</span>');
    if(item.is_best) badges.push('<span class="pc-badge pc-badge--best">Best</span>');
    if(item.price.old && item.price.current < item.price.old) badges.push('<span class="pc-badge pc-badge--sale">Sale</span>');

    const wishPressed = inWishlist(item.id);
    const wishLabel = wishPressed ? 'Remove from wishlist' : 'Add to wishlist';
    const priceNew = moneyPKR(item.price.current);
    const priceOld = item.price.old ? moneyPKR(item.price.old) : '';

    const oosClass = outOfStock ? ' pc--oos is-oos' : '';
    const atcLabel = outOfStock ? 'Out of stock' : 'Add to Cart';
    const atcAttrs = outOfStock ? 'aria-disabled="true" disabled title="Out of stock"' : '';

    return `
      <article class="pc card-soft${oosClass}" data-id="${item.id}">
        <a class="pc__link" href="${item.url}" aria-label="${escapeHtml(item.title)}"></a>

        <div class="pc__media aspect-1x1">
          <img class="pc__img" src="${mainImg}" alt="${imgAlt}" loading="lazy">
          ${item.image_alt2 ? `<img class="pc__img--alt" src="${item.image_alt2}" alt="" aria-hidden="true" loading="lazy">` : ''}
          <div class="pc__badges">${badges.join('')}</div>
          <button class="pc__wish" aria-label="${wishLabel}" aria-pressed="${wishPressed}" data-id="${item.id}">♥</button>
        </div>

        <div class="pc__body">
          <h3 class="pc__title clamp-2">${escapeHtml(item.title)}</h3>
          <div class="pc__rating" aria-label="${item.rating.value} out of 5 stars, ${item.rating.count} review${item.rating.count===1?'':'s'}">
            <span class="pc__rating-stars" aria-hidden="true">${starsSVG(item.rating.value)}</span>
            <span class="pc__rating-num">${item.rating.value.toFixed(1)}</span>
            <span class="pc__rating-count">(${item.rating.count})</span>
          </div>
          <div class="pc__price" aria-label="${priceOld ? `Now ${priceNew}, was ${priceOld}` : `Price ${priceNew}`}">
            <span class="price price--new">${priceNew}</span>
            ${priceOld ? `<span class="price price--old">${priceOld}</span>` : ''}
          </div>
          <div class="pc__cta">
            <button type="button" class="btn-modern btn-modern--primary pc__atc" data-id="${item.id}" ${atcAttrs}>
              <i class="fa-solid fa-bag-shopping" aria-hidden="true"></i>
              <span>${atcLabel}</span>
            </button>
          </div>
        </div>
      </article>
    `;
  }

  // Map existing repo data shapes to the unified schema
  function normalize(raw){
    // Try common keys from storefront-runtime / search
    const id = raw.id || raw.item_id || raw.sku || raw.handle || raw.slug || raw._id;
    const url = raw.url || raw.item_url || (raw.handle ? '/p/'+raw.handle+'/' : raw.slug ? '/p/'+raw.slug+'/' : '#');
    const oos = raw.inStock === false || raw.is_oos === true || raw.stock === 0 || raw.available === false;
    return {
      id: String(id||''),
      url,
      title: raw.title || raw.name || 'Untitled',
      image: raw.image || raw.item_image || (raw.images && raw.images[0]) || '',
      image_alt: raw.image_alt || raw.alt || raw.title || '',
      image_alt2: raw.image_alt2 || (raw.images && raw.images[1]) || '',
      is_new: !!(raw.is_new || raw.tags?.includes?.('new')),
      is_best: !!(raw.is_best || raw.tags?.includes?.('bestseller')),
      is_oos: oos,
      inStock: !oos,
      rating: {
        value: Number(raw.rating?.value ?? raw.rating ?? 0) || 0,
        count: Number(raw.rating?.count ?? raw.reviews ?? 0) || 0
      },
      price: {
        current: Number(raw.price?.current ?? raw.price ?? raw.salePrice ?? 0) || 0,
        old: (raw.price?.old ?? raw.compareAt ?? raw.mrp) != null
          ? Number(raw.price?.old ?? raw.compareAt ?? raw.mrp)
          : null,
        currency: raw.price?.currency || raw.currency || 'PKR'
      }
    };
  }

  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' }[m])); }

  // delegate wishlist/atc events at document level (cards are dynamic)
  document.addEventListener('click', (e)=>{
    const wish = e.target.closest('.pc__wish');
    if(wish){
      e.preventDefault(); e.stopPropagation();
      const id = wish.getAttribute('data-id');
      const state = toggleWishlist(id);
      wish.setAttribute('aria-pressed', state ? 'true' : 'false');
      wish.setAttribute('aria-label', state ? 'Remove from wishlist' : 'Add to wishlist');
      return;
    }
    const atc = e.target.closest('.pc__atc');
    if(atc){ log('pc__atc click', {id: atc && atc.getAttribute('data-id')});
      e.preventDefault(); e.stopPropagation();
      const id = atc.getAttribute('data-id');
      const evt = new CustomEvent('product:addToCart', { detail: { id }, bubbles:true });
      atc.dispatchEvent(evt);
    }
  });

document.addEventListener('product:addToCart', (e)=>{ 
  log('event product:addToCart', e && e.detail);
  
  const detail = e.detail || {};
  const id = String(detail.id || '');
  const qty = Math.max(1, Number(detail.qty) || 1);
  const item = ITEM_CACHE[id];
  if (!item) {
    log('no item found in ITEM_CACHE for id', id);
    return;
  }

  try {
    if (typeof simpleCart !== 'undefined') {
      log('forcing simpleCart.add from product-card (ignore skipSimpleCart)');
      const priceNum = Number(
        (item.price && (item.price.current ?? item.price)) ||
        item.priceCurrent || item.priceNew || 0
      ) || 0;

      simpleCart.add({
        id: id,
        name: item.title || id,
        price: priceNum,
        image: item.image || '',
        quantity: qty
      });
    }
  } catch (err) {
    console.warn('cart error (product-card listener)', err);
  }

  // Always show toast — regardless of skipSimpleCart
  showAddedToast(item && item.title ? item.title : 'Item');
});

  function showAddedToast(name){ log('showAddedToast', name);
    var trigger = document.activeElement;
    try{
      if(window.CartDrawer && typeof window.CartDrawer.open === 'function'){
        window.CartDrawer.open(trigger);
        return;
      }
    }catch(_){ }
    try{
      window.__CART_DRAWER_WANTS_OPEN__ = {
        trigger: trigger && typeof trigger.focus === 'function' ? trigger : null
      };
    }catch(_){ }
    const toast = document.createElement('div');
    toast.className = 'toast-notice position-fixed bottom-0 end-0 m-3 p-2 bg-dark text-white rounded';
    toast.style.zIndex = '1055';
    toast.innerHTML = `Added ${escapeHtml(name)} — <a href="/cart.html" class="text-white text-decoration-underline">View cart</a>`;
    toast.setAttribute('role','status');
    toast.setAttribute('aria-live','polite');
    document.body.appendChild(toast);
    setTimeout(()=>toast.remove(),3000);
  }

  // expose
  global.ProductCard = { renderProductCard, formatPrice };
  if(!global.showAddedToast) global.showAddedToast = showAddedToast;
})(window);
// === Unified ATC Helpers (injected) ===
(function(){
  const ATC_DEBUG = (window.CART_DEBUG !== undefined) ? !!window.CART_DEBUG : true;
  function pclog(){ if(!ATC_DEBUG) return; try{ const a=[...arguments]; a[0]='[PC] '+a[0]; console.log.apply(console,a);}catch(_){} }
  function __pc_price(item){
    let price = null;
    try{
      if (item && item.price && (typeof item.price === 'object')) {
        price = item.price.current ?? item.price.value ?? item.price.amount ?? item.price;
      } else if (item) {
        price = item.priceCurrent ?? item.priceNew ?? item.price;
      }
    }catch(_){ }
    price = Number(price);
    return isNaN(price) ? 0 : price;
  }
  function __pc_simplecart_add(id, item, qty){
    try{
      if (typeof simpleCart !== 'undefined'){
        const name = (item && (item.title || item.name)) || id;
        const price = __pc_price(item);
        const image = (item && (item.image || (item.images && item.images[0]))) || '';
        simpleCart.add({ id: String(id), name, price, image, quantity: Math.max(1, Number(qty)||1) });
        pclog('simpleCart.add', {id, name, price, qty});
      }
    }catch(e){ console.warn('cart error (product-card unified)', e); }
  }
  document.addEventListener('click', function(e){
    const btn = e.target && e.target.closest('.pc__atc');
    if(!btn) return;
    const id = btn.getAttribute('data-id') || btn.dataset.id || btn.getAttribute('data-product-id');
    const qty = btn.getAttribute('data-qty') || btn.dataset.qty || 1;
    const item = (typeof window.ITEM_CACHE !== 'undefined' && window.ITEM_CACHE && id && window.ITEM_CACHE[id]) ? window.ITEM_CACHE[id] : null;
    __pc_simplecart_add(id, item, qty);
    const evt = new CustomEvent('product:addToCart', { detail: { id, qty: Number(qty)||1, skipSimpleCart: false }, bubbles: true });
    btn.dispatchEvent(evt);
  }, true);
  document.addEventListener('product:addToCart', (e)=>{
    const d = e && e.detail || {};
    const id = String(d.id || '');
    const qty = Math.max(1, Number(d.qty)||1);
    const cache = (typeof window.ITEM_CACHE !== 'undefined' && window.ITEM_CACHE) ? window.ITEM_CACHE : {};
    const item = cache[id] || d.item || null;
    __pc_simplecart_add(id, item, qty);
  });
})();
