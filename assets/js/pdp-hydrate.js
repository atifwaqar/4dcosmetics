
(function(){
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
    if (Array.isArray(p.images)&&p.images.length){
      for(var i=0;i<p.images.length;i++){ var src=p.images[i]; if(typeof src==='string' && src.trim().length>4) images.push(src); }
    }
    if (p.image && !images.length) images.push(p.image);
    if (p.item_image && !images.length) images.push(p.item_image);
    images = images.filter(function(s){ return typeof s==='string' && s.trim().length>4; });
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
      description: p.description || p.longDescription || p.body_html || p.body || p.details || p.shortDescription || '',
      how_to_use: p.how_to_use || p.instructions || p.howToUse || '',
      ingredients: p.ingredients || p.Ingredients || '',
      bullets: p.bullets || p.highlights || p.features || p.bulletPoints || '',
      rating: { value: Number(p.rating?.value ?? p.rating ?? 0) || 0, count: Number(p.rating?.count ?? p.reviews ?? 0) || 0 },
      price: { current: Number(priceCurrent)||0, old: priceOld, currency: currency }
    };
  }

  function setHTML(sel, html){ var el = document.querySelector(sel); if(el){ el.innerHTML = html; } }
  function setText(sel, text){ var el = document.querySelector(sel); if(el){ el.textContent = text; } }
  function esc(s){ return String(s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

  function renderGallery(p){
    var mainBox = document.querySelector('.pdp__main');
    var thumbs  = document.querySelector('.pdp__thumbs');
    if (!mainBox || !thumbs) return;
    var imgs = (p.images && p.images.length ? p.images : []).filter(function(s){ return typeof s==='string' && s.trim().length>4; });
    function setMain(src, alt){
      if (src){ mainBox.innerHTML = `<img src="${src}" alt="${esc(alt||p.title)}">`; }
      else { mainBox.innerHTML = `<div style="width:100%;height:100%;background:#f5f5f5;border:1px solid var(--border);border-radius:var(--radius)"></div>`; }
    }
    setMain(imgs[0]||'', p.title);
    if (!imgs.length){ thumbs.innerHTML = ''; return; }
    thumbs.innerHTML = imgs.map((src,i)=>`<button class="pdp__thumb ${i===0?'is-active':''}" type="button" data-src="${src}"><img src="${src}" alt=""></button>`).join('');
    thumbs.addEventListener('click', function(e){
      var btn = e.target.closest('.pdp__thumb'); if(!btn) return;
      thumbs.querySelectorAll('.pdp__thumb').forEach(b=>b.classList.remove('is-active'));
      btn.classList.add('is-active'); setMain(btn.dataset.src, p.title);
    });
  }

  function renderBullets(p){
    var bullets = [];
    if (Array.isArray(p.bullets)) bullets = p.bullets.filter(Boolean);
    else if (typeof p.bullets === 'string') bullets = p.bullets.split(/[•\n,;]+/).map(s=>s.trim()).filter(Boolean);
    else if (typeof p.description === 'string' && p.description.includes(',')){
      bullets = p.description.split(',').map(s=>s.trim()).filter(Boolean).slice(0,4);
    }
    var holder = document.querySelector('.pdp__bullets');
    if (bullets.length){
      var items = bullets.slice(0,6).map(li=>`<li>${esc(li)}</li>`).join('');
      if (holder){ holder.innerHTML = items; holder.style.display='block'; }
      else {
        // Replace any literal {{ bullets }} placeholder
        var replaced = false;
        document.querySelectorAll('body *').forEach(function(node){
          if (!replaced && node.childNodes && node.childNodes.length===1 && node.childNodes[0].nodeType===3){
            if (node.textContent.trim() === '{{ bullets }}'){
              node.outerHTML = `<ul class="pdp__bullets">${items}</ul>`;
              replaced = true;
            }
          }
        });
      }
    }else{
      if (holder) holder.remove();
      // remove plain placeholder if present
      document.querySelectorAll('body *').forEach(function(node){
        if (node.childNodes && node.childNodes.length===1 && node.childNodes[0].nodeType===3){
          if (node.textContent.trim() === '{{ bullets }}'){ node.remove(); }
        }
      });
    }
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
      var html = (window.ProductCard && ProductCard.renderProductCard) ?
        ProductCard.renderProductCard({ rating:{ value:p.rating.value, count:p.rating.count }, id:'__', url:'#', title:'', image:'' }).match(/pc__rating-stars"[^>]*>(.*?)<\/span>/)?.[1] : '';
      if(html) ratingEl.innerHTML = html;
      var num = document.querySelector('.pc__rating-num'); if(num) num.textContent = (p.rating.value||0).toFixed(1);
      var cnt = document.querySelector('.pc__rating-count'); if(cnt) cnt.textContent = '('+(p.rating.count||0)+')';
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

  function wireWishlist(p){
    var btn = document.querySelector('[data-wishlist]');
    if(!btn) return;
    var KEY = 'wishlist_ids_v1';
    function load(){ try{ return JSON.parse(localStorage.getItem(KEY) || '[]'); }catch(_){ return []; } }
    function save(arr){ localStorage.setItem(KEY, JSON.stringify(arr)); }
    function inList(){ return load().includes(String(p.id || p.slug)); }
    function toggle(){
      var idStr = String(p.id || p.slug);
      var list = load();
      if(list.includes(idStr)) list = list.filter(function(x){ return x!==idStr; }); else list.push(idStr);
      save(list);
      return list.includes(idStr);
    }
    function sync(){
      var state = inList();
      btn.setAttribute('aria-pressed', state ? 'true' : 'false');
      btn.textContent = state ? 'Remove from Wishlist' : 'Add to Wishlist';
    }
    btn.addEventListener('click', function(){ toggle(); sync(); });
    sync();
  }

  function getSelectedVariant(){
    var el = document.querySelector('.variant-swatch.selected') || document.querySelector('.variant-swatch[aria-pressed="true"]') || document.querySelector('select[name="variant"] option:checked') || document.querySelector('input[name="variant"]:checked');
    if(!el) return '';
    return el.getAttribute('aria-label') || el.title || el.textContent || el.value || '';
  }

  function wireWhatsApp(p){
    document.querySelectorAll('[data-wa-order]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var raw = (document.documentElement?.dataset?.whatsapp || window.__SHOP_WHATSAPP__ || '').replace(/\D/g,'');
        if(!raw) return;
        var variant = getSelectedVariant();
        var lines = [];
        lines.push(p.title || p.name || '');
        if(variant) lines[0] += ' - ' + variant;
        lines.push(location.href);
        lines.push("I'd like to order via Cash on Delivery.");
        var waUrl = 'https://wa.me/' + raw + '?text=' + encodeURIComponent(lines.join('\n'));
        window.open(waUrl, '_blank');
      });
    });
  }

  async function hydrate(){
    var p = window.__CURRENT_PRODUCT__ || null;
    if (!p){
      const all = await loadAllProducts();
      var raw = all.find(x => matchBySlug(x, slug));
      if (!raw) raw = all.find(x => (x.name||x.title||'').toLowerCase().includes(slug.replace(/-/g,' ')));
      if (!raw) return;
      p = normalize(raw);
      window.__CURRENT_PRODUCT__ = p;
    }
    if(p.brand) setText('.pdp__brand', p.brand); else { var b=document.querySelector('.pdp__brand'); if(b) b.style.display='none'; }
    setText('.pdp__title', p.title || p.name || '');
    setHTML('[data-panel="desc"]', p.descriptionHTML || p.description || '');
    setHTML('[data-panel="ingr"]', p.ingredients || '');
    setHTML('[data-panel="use"]',  p.howToUse || p.how_to_use || '');
    renderBullets(p);
    renderGallery(p);
    renderPrice(p);
    renderRating(p);
    wireATC(p);
    wireWishlist(p);
    wireWhatsApp(p);
  }

  hydrate();
})();
