// exports: renderProductCard(item), formatPrice(number, currency)
(function(global){
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
    if(atc){
      e.preventDefault(); e.stopPropagation();
      const id = atc.getAttribute('data-id');
      const evt = new CustomEvent('product:addToCart', { detail: { id }, bubbles:true });
      atc.dispatchEvent(evt);
    }
  });

  document.addEventListener('product:addToCart', (e)=>{
    const detail = e.detail || {};
    const id = detail.id;
    const qty = Number(detail.qty) || 1;
    const skipSimpleCart = !!detail.skipSimpleCart;
    const item = ITEM_CACHE[id];
    if(!item) return;
    try{
      if(!skipSimpleCart && typeof simpleCart !== 'undefined'){
        simpleCart.add({
          id: id,
          name: item.title,
          price: item.price.current,
          image: item.image,
          quantity: qty
        });
      }
    }catch(err){ console.warn('cart error', err); }
    if(!skipSimpleCart) showAddedToast(item.title);
  });

  function showAddedToast(name){
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
