(function(){
  // Expect product data from runtime (adapt if your runtime differs)
  const product = window.Storefront?.getCurrentProduct?.() || window.__CURRENT_PRODUCT__;
  if(!product) return;
  const outOfStock = product.inStock === false;

  // Populate gallery
  const mainBox = document.querySelector('.pdp__main');
  const thumbs  = document.querySelector('.pdp__thumbs');
  const images = (product.images && product.images.length ? product.images : [product.image]).filter(Boolean);
  function setMain(src, alt){
    mainBox.innerHTML = `<img src="${src}" alt="${(alt || product.title || '').replace(/"/g,'&quot;')}" loading="eager">`;
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

  // Rating
  const ratingEl = document.querySelector('.pdp__rating-stars');
  if(ratingEl && window.ProductCard){ ratingEl.innerHTML = ProductCard.renderProductCard({ rating:{ value: product.rating?.value || product.rating || 0, count: product.rating?.count || product.reviews || 0 }, id:'__r', url:'#', title:'', image:'' }).match(/pc__rating-stars"[^>]*>(.*?)<\/span>/)?.[1] || ''; }

  // Price
  const priceNew = moneyPKR(product.price?.current ?? product.price);
  const priceOld = product.price?.old ?? product.compareAt ?? null;
  const priceBlock = document.querySelector('.pdp__price');
  if(priceBlock){
    priceBlock.innerHTML = `
      <span class="price price--new">${priceNew}</span>
      ${priceOld? `<span class="price price--old">${moneyPKR(priceOld)}</span>`:''}
    `;
    const mobilePrice = document.getElementById('mobile-atc-price');
    if(mobilePrice) mobilePrice.textContent = priceNew;
  }

  // ATC buttons
  function addToCart(qty){
    try{
      if(typeof simpleCart !== 'undefined'){
        simpleCart.add({ id: product.id || product.slug, name: product.name || product.title, price: product.price?.current ?? product.price, quantity: qty||1 });
      }
    }catch(e){ console.warn('cart error', e); }
    document.dispatchEvent(new CustomEvent('product:addToCart', { detail:{ id: product.id || product.slug, qty: qty||1 }}));
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
      btn.addEventListener('click', ()=> addToCart(1));
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
})();
