(function(){
  const titleEl = document.querySelector('.pdp__title');
  if (!titleEl) return;

  // When the template still contains liquid-style placeholders we let
  // pdp-hydrate.js own the rendering/wiring instead of double-binding here.
  const rawTitle = titleEl.textContent || '';
  if (!rawTitle.trim() || rawTitle.includes('{{')) return;

  let bootstrapped = false;

  function getProductCandidate(){
    return window.Storefront?.getCurrentProduct?.() || window.__CURRENT_PRODUCT__ || null;
  }

  function normalizeSlugPart(part){
    return String(part || '')
      .toLowerCase()
      .replace(/\.html?$/, '')
      .replace(/\/+$/, '')
      .trim();
  }

  function detectSlug(){
    const match = (location.pathname || '').match(/\/p\/([^\/]+)/i);
    if (!match) return '';
    return normalizeSlugPart(decodeURIComponent(match[1]));
  }

  async function loadFallbackProduct(){
    const slug = detectSlug();
    if (!slug) return null;

    function norm(v){
      return normalizeSlugPart(v)
        .replace(/&/g,'and')
        .replace(/[^a-z0-9]+/g,'-')
        .replace(/^-+|-+$/g,'');
    }

    function match(p){
      if (!p) return false;
      const candidates = [p.slug, p.handle, p.id, p._id]
        .map(norm)
        .filter(Boolean);
      if (candidates.includes(slug)) return true;
      if (p.url){
        try{
          const url = new URL(p.url, location.origin);
          const tail = norm(url.pathname.split('/').pop());
          if (tail === slug) return true;
        }catch(_){ }
      }
      const titles = [p.name, p.title].map(norm).filter(Boolean);
      if (titles.includes(slug)) return true;
      return false;
    }

    function normalize(p){
      const imgList = [];
      if (Array.isArray(p.images)){
        p.images.forEach(src=>{ if (typeof src === 'string' && src.trim()) imgList.push(src); });
      }
      if (p.image && !imgList.length) imgList.push(p.image);
      if (p.item_image && !imgList.length) imgList.push(p.item_image);

      const current = (p.price && (p.price.current ?? p.price)) ?? p.salePrice ?? p.min_price ?? p.amount ?? 0;
      const old = p.price?.old ?? p.compareAt ?? p.mrp ?? null;

      return {
        id: String(p.id || p.slug || p.handle || p._id || ''),
        slug: p.slug || p.handle || norm(p.name || p.title || ''),
        name: p.name || p.title || 'Untitled product',
        title: p.title || p.name || 'Untitled product',
        images: imgList,
        image: imgList[0] || p.image || '',
        rating: {
          value: Number(p.rating?.value ?? p.rating ?? 0) || 0,
          count: Number(p.rating?.count ?? p.reviews ?? 0) || 0
        },
        price: {
          current: Number(current) || 0,
          old: old != null ? Number(old) : null
        },
        compareAt: p.compareAt,
        reviews: p.reviews,
        brand: p.brand || p.vendor || p.manufacturer || '',
        inStock: p.inStock !== false,
        is_oos: p.inStock === false,
        url: p.url || location.pathname
      };
    }

    async function loadAll(){
      try{
        if (window.Storefront && typeof Storefront.getAllProducts === 'function'){
          const r = await Storefront.getAllProducts();
          if (Array.isArray(r) && r.length) return r;
        }
      }catch(_){ }
      try{
        if (window.Storefront && typeof Storefront.getAll === 'function'){
          const r = await Storefront.getAll();
          if (Array.isArray(r) && r.length) return r;
        }
      }catch(_){ }
      try{
        if (window.Storefront && typeof Storefront.getProducts === 'function'){
          const r = await Storefront.getProducts();
          if (Array.isArray(r) && r.length) return r;
        }
      }catch(_){ }

      const keys = ['ALL_PRODUCTS','__ALL_PRODUCTS__','PRODUCTS','__PRODUCTS__','products','catalog','CATALOG'];
      for (let i=0;i<keys.length;i++){
        const val = window[keys[i]];
        if (Array.isArray(val) && val.length) return val;
      }

      try{
        const resp = await fetch('/assets/data/products.json',{ credentials:'same-origin' });
        if (resp.ok){
          const json = await resp.json();
          if (Array.isArray(json)) return json;
          if (Array.isArray(json?.products)) return json.products;
        }
      }catch(_){ }
      return [];
    }

    const all = await loadAll();
    const found = all.find(match);
    return found ? normalize(found) : null;
  }

  function bootstrap(product){
    if (bootstrapped || !product) return false;
    bootstrapped = true;
    if (!window.__CURRENT_PRODUCT__) window.__CURRENT_PRODUCT__ = product;

    const outOfStock = product.inStock === false;

  // Populate gallery
  const mainBox = document.querySelector('.pdp__main');
  const thumbs  = document.querySelector('.pdp__thumbs');
  if (mainBox && thumbs){
    const images = (product.images && product.images.length ? product.images : [product.image]).filter(Boolean);
    function setMain(src, alt){
      if (!mainBox) return;
      if (src){
        mainBox.innerHTML = `<img src="${src}" alt="${(alt || product.title || '').replace(/"/g,'&quot;')}" loading="eager">`;
      }else{
        mainBox.innerHTML = '';
      }
    }
    setMain(images[0], product.alt || product.title);
    thumbs.innerHTML = images.map((src,i)=>`
      <button class="pdp__thumb ${i===0?'is-active':''}" type="button" data-src="${src}">
        <img src="${src}" alt="" aria-hidden="true" loading="lazy">
      </button>`).join('');
    thumbs.addEventListener('click', (e)=>{
      const btn = e.target.closest('.pdp__thumb'); if(!btn) return;
      thumbs.querySelectorAll('.pdp__thumb').forEach(b=>b.classList.remove('is-active'));
      btn.classList.add('is-active'); setMain(btn.dataset.src, product.title);
    });
  }

  // Rating
  const ratingEl = document.querySelector('.pdp__rating-stars');
  if(ratingEl && window.ProductCard){ ratingEl.innerHTML = ProductCard.renderProductCard({ rating:{ value: product.rating?.value || product.rating || 0, count: product.rating?.count || product.reviews || 0 }, id:'__r', url:'#', title:'', image:'' }).match(/pc__rating-stars"[^>]*>(.*?)<\/span>/)?.[1] || ''; }

  // Price
  const priceCurrent = Number(product.price?.current ?? product.price ?? 0);
  const priceOldRaw = product.price?.old ?? product.compareAt ?? null;
  const priceOld = priceOldRaw != null ? Number(priceOldRaw) : null;
  const priceBlock = document.querySelector('.pdp__price');
  if(priceBlock){
    const priceNewFmt = moneyPKR(priceCurrent);
    const priceOldFmt = priceOld != null ? moneyPKR(priceOld) : '';
    const saleBadge = priceOld != null && priceOld > priceCurrent ? '<span class="pc-badge pc-badge--sale">Sale</span>' : '';
    priceBlock.innerHTML = `
      <span class="price price--new">${priceNewFmt}</span>
      ${priceOldFmt? `<span class="price price--old">${priceOldFmt}</span>`:''}
      ${saleBadge}
    `;
    const mobilePrice = document.getElementById('mobile-atc-price');
    if(mobilePrice) mobilePrice.textContent = priceNewFmt;
  }

  // ATC buttons
  function addToCart(qty, trigger){
    const quantity = qty || 1;
    try{
      if(typeof simpleCart !== 'undefined'){
        simpleCart.add({
          id: product.id || product.slug,
          name: product.name || product.title,
          price: product.price?.current ?? product.price,
          image: (product.images && product.images[0]) || product.image || '',
          quantity: quantity
        });
      }
    }catch(e){ console.warn('cart error', e); }
    const detail = { qty: quantity, skipSimpleCart: true };
    const pid = product.id || product.slug;
    if(pid) detail.id = pid;
    const evt = new CustomEvent('product:addToCart', { detail, bubbles: true });
    (trigger || document).dispatchEvent(evt);
    if(typeof showAddedToast === 'function') showAddedToast(product.name || product.title);
  }
  const atcButtons = document.querySelectorAll('[data-atc]');
  if(outOfStock){
    atcButtons.forEach(btn=>{
      btn.setAttribute('disabled','');
      btn.setAttribute('aria-disabled','true');
      btn.textContent = 'Out of stock';
    });
    document.querySelectorAll('[data-qty], [data-qty-controls], .qty-controls, .pdp__qty').forEach(el=>{
      el.style.display = 'none';
    });
  }else{
    atcButtons.forEach(btn=>{
      btn.addEventListener('click', ()=> addToCart(1, btn));
    });
  }

  // Wishlist button
  const WISHLIST_KEY = 'wishlist_ids_v1';
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
  const wishBtn = document.querySelector('[data-wishlist]');
  const pid = product.id || product.slug;
  if(wishBtn && pid){
    function sync(){
      const state = inWishlist(pid);
      wishBtn.setAttribute('aria-pressed', state ? 'true' : 'false');
      wishBtn.textContent = state ? 'Remove from Wishlist' : 'Add to Wishlist';
    }
    wishBtn.addEventListener('click', ()=>{
      toggleWishlist(pid);
      sync();
    });
    sync();
  }

  // Remove tabs whose panels have no text
  document.querySelectorAll('.pdp-tabs__panel').forEach(panel=>{
    if(!panel.textContent.trim()){
      const id = panel.dataset.panel;
      const btn = document.querySelector(`.pdp-tabs__nav [data-tab="${id}"]`);
      if(btn) btn.remove();
      panel.remove();
    }
  });

  // Tabs
  const tabs = document.querySelectorAll('[data-tab]');
  const panels = document.querySelectorAll('[data-panel]');
  function activate(id){
    tabs.forEach(b=>b.classList.toggle('is-active', b.dataset.tab===id));
    panels.forEach(p=>p.classList.toggle('is-active', p.dataset.panel===id));
  }
  tabs.forEach(b=>b.addEventListener('click', ()=> activate(b.dataset.tab)));
  // default
  const firstTab = Array.from(tabs).find(Boolean); firstTab && activate(firstTab.dataset.tab);
    return true;
  }

  function scheduleBootstrap(){
    if (bootstrap(getProductCandidate())) return;

    let attempts = 0;
    const maxAttempts = 50; // ~5s
    let fallbackPromise = null;

    function triggerFallback(){
      if (!fallbackPromise){
        fallbackPromise = loadFallbackProduct().then(p=>{
          bootstrap(p);
          return p;
        });
      }
      return fallbackPromise;
    }

    const timer = setInterval(()=>{
      const product = getProductCandidate();
      if (product){
        clearInterval(timer);
        bootstrap(product);
        return;
      }
      attempts++;
      if (attempts >= maxAttempts){
        clearInterval(timer);
        triggerFallback();
      }
    }, 100);

    // Fire fallback fetch immediately as well; whichever resolves first wins.
    triggerFallback();
  }

  if (!bootstrap(getProductCandidate())){
    document.addEventListener('storefront:currentProduct', function(evt){
      if (evt && evt.detail) bootstrap(evt.detail);
    }, { once: true });
    scheduleBootstrap();
  }
})();
