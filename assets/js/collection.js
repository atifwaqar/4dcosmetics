
(function(){
  // If product grid already has items, bail
  var grid = document.getElementById('product-grid');
  if (!grid){
    // Create if missing (some older templates)
    var container = document.querySelector('.container, .container-narrow, main, body');
    if (container){
      grid = document.createElement('div');
      grid.id = 'product-grid';
      grid.className = 'product-grid';
      container.appendChild(grid);
    }
  }
  if (!grid) return;

  // Hide legacy "Load more" if present
  var lm = document.getElementById('load-more-container');
  if (lm) lm.style.display = 'none';

  function norm(s){
    return String(s||'')
      .toLowerCase()
      .trim()
      .replace(/&/g,'and')
      .replace(/[^a-z0-9]+/g,'-')
      .replace(/^-+|-+$/g,'');
  }

  // Normalize category synonyms
  function normalizeCategoryName(s){
    s = norm(s);
    if (s === 'skin-care' || s === 'skincare') return 'skin-care';
    if (s === 'face' || s === 'eyes' || s === 'lips' || s === 'nails') return 'makeup';
    return s;
  }

  function detectCategorySlug(){
    var m = (location.pathname||'').match(/\/c\/([^\/]+)\/?/i);
    var slug = m ? m[1] : '';
    slug = normalizeCategoryName(slug||'beauty');
    return slug;
  }
  var CAT_SLUG = detectCategorySlug();

  // Load products from any available source
  async function loadAllProducts(){
    try{ if (window.Storefront && typeof Storefront.getCategoryProducts === 'function'){ 
      var r = await Storefront.getCategoryProducts(CAT_SLUG);
      if (Array.isArray(r) && r.length) return r;
    } }catch(e){}
    try{ if (window.Storefront && typeof Storefront.getAllProducts === 'function'){ 
      var r1 = await Storefront.getAllProducts(); if (Array.isArray(r1)) return r1; 
    } }catch(e){}
    try{ if (window.Storefront && typeof Storefront.getAll === 'function'){ 
      var r2 = await Storefront.getAll(); if (Array.isArray(r2)) return r2; 
    } }catch(e){}
    try{ if (window.Storefront && typeof Storefront.getProducts === 'function'){ 
      var r3 = await Storefront.getProducts(); if (Array.isArray(r3)) return r3; 
    } }catch(e){}
    var keys = ['__CATEGORY_PRODUCTS__','CATEGORY_PRODUCTS','ALL_PRODUCTS','__ALL_PRODUCTS__','PRODUCTS','__PRODUCTS__','products','catalog','CATALOG'];
    for (var i=0;i<keys.length;i++){ var v = window[keys[i]]; if (Array.isArray(v) && v.length) return v; }
    try{
      var resp = await fetch('/assets/data/products.json',{credentials:'same-origin'});
      if (resp.ok){ var json = await resp.json(); if (Array.isArray(json)) return json; if (Array.isArray(json.products)) return json.products; }
    }catch(_){}
    return [];
  }

  // Try to extract categories from a product in many shapes
  function extractCategories(p){
    var cats = [];
    function push(x){
      if (!x) return;
      if (Array.isArray(x)){ x.forEach(push); return; }
      if (typeof x === 'string'){ cats.push(x); return; }
      // objects
      if (x.name) cats.push(x.name);
      if (x.title) cats.push(x.title);
      if (x.slug) cats.push(x.slug);
    }
    push(p.category || p.collection || p.product_type || p.type);
    push(p.categories || p.collections);
    // tags may include category words
    push(p.tags);
    // url hint
    try{
      if (p.url){
        var u = new URL(p.url, location.origin);
        var m = u.pathname.match(/\/c\/([^\/]+)/i); if(m) cats.push(m[1]);
      }
    }catch(_){}
    // brand isn't a category but sometimes used; do not push brand
    return Array.from(new Set(cats.map(normalizeCategoryName).filter(Boolean)));
  }

  function belongsToCategory(p, slug){
    if (!slug || slug==='beauty') return true; // root category shows all
    var cats = extractCategories(p);
    if (cats.includes(slug)) return true;
    // Heuristic: for 'makeup', include face/eyes/lips/nails
    if (slug==='makeup'){
      var makeupSubs = ['face','eyes','lips','nails'].map(normalizeCategoryName);
      if (cats.some(c => makeupSubs.includes(c))) return true;
    }
    // Last resort: look in name/description
    var hay = (p.name||p.title||'') + ' ' + (p.description||p.body||'');
    if (norm(hay).includes(slug)) return true;
    return false;
  }

  function normalizeProduct(p){
    // compute a simple comparable price
    var current = (p.price && (p.price.current ?? p.price)) ?? p.salePrice ?? p.min_price ?? p.amount ?? 0;
    return { 
      raw: p,
      priceNum: Number(current) || 0,
      title: p.title || p.name || ''
    };
  }

  function renderGrid(items){
    if (!items.length){
      grid.innerHTML = '<p class="text-center text-muted my-4">No products found in this category.</p>';
      return;
    }
    // use ProductCard renderer if present, else fallback to ui-cards buildProductCard
    var html = '';
    if (window.ProductCard && typeof ProductCard.renderProductCard === 'function'){
      html = items.map(function(p){ return ProductCard.renderProductCard(p); }).join('');
      grid.innerHTML = html;
    }else if (typeof buildProductCard === 'function'){
      grid.innerHTML = '';
      items.forEach(function(p){
        var el = buildProductCard(p);
        if (el) grid.appendChild(el);
      });
    }else{
      grid.innerHTML = items.map(function(p){
        return '<div class="card-soft" style="padding:12px">'+(p.title||'')+'</div>';
      }).join('');
    }
  }

  function applySort(items, sort){
    var arr = items.slice();
    switch(sort){
      case 'price_asc': arr.sort((a,b)=>(a.price?.current??a.price??0)-(b.price?.current??b.price??0)); break;
      case 'price_desc': arr.sort((a,b)=>(b.price?.current??b.price??0)-(a.price?.current??a.price??0)); break;
      case 'name_asc': arr.sort((a,b)=>String(a.name||a.title).localeCompare(String(b.name||b.title))); break;
      case 'newest': arr.sort((a,b)=>(b.created_at||0)-(a.created_at||0)); break;
    }
    return arr;
  }

  function getSort(){
    var sel = document.getElementById('sort-select');
    if (sel && sel.value) return sel.value;
    return 'featured';
  }

  async function run(){
    try{
      var all = await loadAllProducts();
      // If any items are wrapped e.g. {product:{...}}, unwrap common patterns
      all = all.map(function(x){ return x.product || x.node || x; });
      // Filter to category
      var filtered = all.filter(function(p){ return belongsToCategory(p, CAT_SLUG); });
      // If filtering produced nothing but we had products, fallback to all
      if (!filtered.length && all.length) filtered = all;
      // Sort
      filtered = applySort(filtered, getSort());
      // Limit initial render to something reasonable
      var initial = filtered.slice(0, 24);
      renderGrid(initial);

      // Simple "Load more" if legacy button exists
      var btn = document.getElementById('load-more');
      if (btn){
        var cursor = 24;
        btn.addEventListener('click', function(){
          var next = filtered.slice(cursor, cursor+24);
          cursor += 24;
          if (next.length){
            if (window.ProductCard && ProductCard.renderProductCard){
              var frag = next.map(function(p){ return ProductCard.renderProductCard(p); }).join('');
              grid.insertAdjacentHTML('beforeend', frag);
            }else if (typeof buildProductCard === 'function'){
              next.forEach(function(p){
                var el = buildProductCard(p);
                if (el) grid.appendChild(el);
              });
            }
          }
          if (cursor >= filtered.length) btn.disabled = true;
        });
      }
    }catch(e){
      console.warn('collection hydrate error', e);
    }
  }

  // wire sort change if present
  var sel = document.getElementById('sort-select');
  if (sel){
    sel.addEventListener('change', run);
  }

  run();
})();
