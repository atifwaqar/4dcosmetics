
(function(){
  // If PDP already hydrated, skip
  var titleEl = document.querySelector('.pdp__title');
  if (!titleEl) return;
  if (titleEl.textContent && titleEl.textContent.trim() && !titleEl.textContent.includes('{{')) return;

  function detectSlug(){
    var m = (location.pathname||'').match(/\/p\/([^\/]+)/i);
    return m ? decodeURIComponent(m[1]).toLowerCase() : '';
  }
  var slug = detectSlug();

  async function loadAllProducts(){
    try{ if (window.Storefront && typeof Storefront.getAllProducts === 'function'){ const r = await Storefront.getAllProducts(); if (Array.isArray(r)) return r; } }catch(e){}
    try{ if (window.Storefront && typeof Storefront.getAll === 'function'){ const r = await Storefront.getAll(); if (Array.isArray(r)) return r; } }catch(e){}
    try{ if (window.Storefront && typeof Storefront.getProducts === 'function'){ const r = await Storefront.getProducts(); if (Array.isArray(r)) return r; } }catch(e){}
    var keys = ['ALL_PRODUCTS','__ALL_PRODUCTS__','PRODUCTS','__PRODUCTS__','products','catalog','CATALOG'];
    for (var i=0;i<keys.length;i++){ var v = window[keys[i]]; if (Array.isArray(v)) return v; }
    try{
      const resp = await fetch('/assets/data/products.json',{credentials:'same-origin'});
      if (resp.ok){ const json = await resp.json(); if (Array.isArray(json)) return json; if (Array.isArray(json.products)) return json.products; }
    }catch(_){}
    return [];
  }

  function norm(v){
    return String(v||'').toLowerCase().trim().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  }
  function matchBySlug(p, s){
    if (!p) return false;
    if (norm(p.slug)===s || norm(p.handle)===s || norm(p.id)===s || norm(p._id)===s) return true;
    if (p.url){ try{ var u=new URL(p.url, location.origin); if (u.pathname.endsWith('/'+s) || norm(u.pathname.split('/').pop())===s) return true; }catch(e){} }
    if (norm(p.name)===s || norm(p.title)===s) return true;
    return false;
  }
  function normalize(p){
    var images=[];
    if (Array.isArray(p.images)&&p.images.length){ for(var i=0;i<p.images.length;i++){ if(p.images[i]) images.push(p.images[i]); } }
    if (p.image && !images.length) images.push(p.image);
    if (p.item_image && !images.length) images.push(p.item_image);
    var priceCurrent = (p.price && (p.price.current ?? p.price)) ?? p.salePrice ?? p.min_price ?? p.amount ?? 0;
    var priceOld = p.price?.old ?? p.compareAt ?? p.mrp ?? null;
    var currency = p.price?.currency || p.currency || 'PKR';
    return {
      id: String(p.id || p.slug || p.handle || p._id || ''),
      slug: p.slug || p.handle || norm(p.name || p.title || ''),
      name: p.name || p.title || 'Untitled product',
      title: p.title || p.name || 'Untitled product',
      brand: p.brand || p.vendor || p.manufacturer || '',
      images: images,
      description: p.description || p.body_html || p.body || p.details || '',
      how_to_use: p.how_to_use || p.instructions || '',
      ingredients: p.ingredients || '',
      rating: { value: Number(p.rating?.value ?? p.rating ?? 0) || 0, count: Number(p.rating?.count ?? p.reviews ?? 0) || 0 },
      price: { current: Number(priceCurrent)||0, old: priceOld, currency: currency }
    };
  }

  function setHTML(sel, html){ var el = document.querySelector(sel); if(el){ el.innerHTML = html; } }
  function setText(sel, text){ var el = document.querySelector(sel); if(el){ el.textContent = text; } }
  function show(el){ el && (el.hidden=false); } function hide(el){ el && (el.hidden=true); }

  function renderGallery(p){
    var mainBox = document.querySelector('.pdp__main');
    var thumbs  = document.querySelector('.pdp__thumbs');
    if (!mainBox || !thumbs) return;
    var imgs = p.images && p.images.length ? p.images : [''];
    function setMain(src, alt){ mainBox.innerHTML = src ? `<img src="${src}" alt="${(alt||p.title).replace(/"/g,'&quot;')}">` : `<div style="width:100%;height:100%;background:#f5f5f5;border:1px solid var(--border);border-radius:var(--radius)"></div>`; }
    setMain(imgs[0], p.title);
    thumbs.innerHTML = imgs.map((src,i)=>`<button class="pdp__thumb ${i===0?'is-active':''}" type="button" data-src="${src}"><img src="${src}" alt=""></button>`).join('');
    thumbs.addEventListener('click', function(e){
      var btn = e.target.closest('.pdp__thumb'); if(!btn) return;
      thumbs.querySelectorAll('.pdp__thumb').forEach(b=>b.classList.remove('is-active'));
      btn.classList.add('is-active'); setMain(btn.dataset.src, p.title);
    });
  }

  function renderPrice(p){
    var fmt = (window.ProductCard && ProductCard.formatPrice) ? ProductCard.formatPrice : function(n,c){ try{return new Intl.NumberFormat(undefined,{style:'currency',currency:c||'PKR'}).format(n);}catch(_){return (c||'PKR')+' '+(n||0);} };
    var priceNew = fmt(p.price.current, p.price.currency);
    var priceOld = p.price.old ? fmt(p.price.old, p.price.currency) : '';
    var block = document.querySelector('.pdp__price');
    if(block){
      block.innerHTML = `<span class="price price--new">${priceNew}</span>${priceOld?` <span class="price price--old">${priceOld}</span>`:''}`;
      var mobile = document.getElementById('mobile-atc-price'); if(mobile) mobile.textContent = priceNew;
    }
  }

  function renderRating(p){
    try{
      var ratingEl = document.querySelector('.pdp__rating-stars');
      if(!ratingEl) return;
      // reuse ProductCard trick to get stars markup
      var html = (window.ProductCard && ProductCard.renderProductCard) ?
        ProductCard.renderProductCard({ rating:{ value:p.rating.value, count:p.rating.count }, id:'__', url:'#', title:'', image:'' }).match(/pc__rating-stars"[^>]*>(.*?)<\/span>/)?.[1] : '';
      if(html) ratingEl.innerHTML = html;
      setText('.pc__rating-num', (p.rating.value||0).toFixed(1));
      setText('.pc__rating-count', '('+(p.rating.count||0)+')');
    }catch(_){}
  }

  function wireATC(p){
    document.querySelectorAll('[data-atc]').forEach(function(btn){
      btn.addEventListener('click', function(){
        try{
          if(typeof simpleCart !== 'undefined'){
            simpleCart.add({ id: p.id || p.slug, name: p.name, price: p.price.current, quantity: 1, image: (p.images && p.images[0]) || '' });
          }
        }catch(e){ console.warn('cart error', e); }
        document.dispatchEvent(new CustomEvent('product:addToCart',{detail:{id:p.id||p.slug,qty:1}}));
      });
    });
  }

  async function hydrate(){
    // use existing
    var p = window.__CURRENT_PRODUCT__ || null;
    if (!p){
      const all = await loadAllProducts();
      var raw = all.find(x => matchBySlug(x, slug));
      if (!raw) raw = all.find(x => (x.name||x.title||'').toLowerCase().includes(slug.replace(/-/g,' ')));
      if (!raw) return; // nothing we can do
      p = normalize(raw);
      window.__CURRENT_PRODUCT__ = p;
    }
    // render
    if(p.brand) setText('.pdp__brand', p.brand); else { var b=document.querySelector('.pdp__brand'); if(b) b.style.display='none'; }
    setText('.pdp__title', p.title || p.name || '');
    setHTML('[data-panel="desc"]', p.description || '');
    setHTML('[data-panel="ingr"]', p.ingredients || '');
    setHTML('[data-panel="use"]',  p.how_to_use || '');
    renderGallery(p);
    renderPrice(p);
    renderRating(p);
    wireATC(p);
  }

  hydrate();
})();
