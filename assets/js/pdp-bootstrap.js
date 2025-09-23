
(function(){
  // Only run on product pages /p/{slug}
  function normalizeSlugPart(part){
    return String(part || '')
      .toLowerCase()
      .replace(/\.html?$/, '')
      .replace(/\/+$/, '')
      .trim();
  }

  var m = (location.pathname || '').match(/\/p\/([^\/]+)/i);
  if (!m) return;
  var slug = normalizeSlugPart(decodeURIComponent(m[1]));

  async function loadAllProducts(){
    // Try runtime getters
    try{ if (window.Storefront && typeof Storefront.getAllProducts === 'function'){ const r = await Storefront.getAllProducts(); if (Array.isArray(r)) return r; } }catch(e){}
    try{ if (window.Storefront && typeof Storefront.getAll === 'function'){ const r = await Storefront.getAll(); if (Array.isArray(r)) return r; } }catch(e){}
    try{ if (window.Storefront && typeof Storefront.getProducts === 'function'){ const r = await Storefront.getProducts(); if (Array.isArray(r)) return r; } }catch(e){}
    // Globals
    var keys = ['ALL_PRODUCTS','__ALL_PRODUCTS__','PRODUCTS','__PRODUCTS__','products','catalog','CATALOG'];
    for (var i=0;i<keys.length;i++){ var v = window[keys[i]]; if (Array.isArray(v)) return v; }
    // JSON fallback
    try{
      const resp = await fetch('/assets/data/products.json',{credentials:'same-origin'});
      if (resp.ok){ const json = await resp.json(); if (Array.isArray(json)) return json; if (Array.isArray(json.products)) return json.products; }
    }catch(e){}
    return [];
  }

  function norm(v){
    return normalizeSlugPart(v)
      .replace(/&/g,'and')
      .replace(/[^a-z0-9]+/g,'-')
      .replace(/^-+|-+$/g,'');
  }

  function matchBySlug(p, slug){
    if (!p) return false;
    if (norm(p.slug) === slug) return true;
    if (norm(p.handle) === slug) return true;
    if (norm(p.id) === slug) return true;
    if (norm(p._id) === slug) return true;
    if (p.url){ try{ const u = new URL(p.url, location.origin); if (u.pathname.endsWith('/'+slug) || norm(u.pathname.split('/').pop()) === slug) return true; }catch{} }
    // derive from title/name
    if (norm(p.name) === slug || norm(p.title) === slug) return true;
    return false;
  }

  function normalize(p){
    const images = [];
    if (Array.isArray(p.images) && p.images.length){ for (var i=0;i<p.images.length;i++){ if (p.images[i]) images.push(p.images[i]); } }
    if (p.image && !images.length) images.push(p.image);
    if (p.item_image && !images.length) images.push(p.item_image);

    const priceCurrent = (p.price && (p.price.current ?? p.price)) ?? p.salePrice ?? p.min_price ?? p.amount ?? 0;
    const priceOld = p.price?.old ?? p.compareAt ?? p.mrp ?? null;
    const currency = p.price?.currency || p.currency || 'PKR';

    return {
      id: String(p.id || p.slug || p.handle || p._id || ''),
      slug: p.slug || p.handle || norm(p.name || p.title || ''),
      name: p.name || p.title || 'Untitled product',
      title: p.title || p.name || 'Untitled product',
      brand: p.brand || p.vendor || p.manufacturer || '',
      url: p.url || ('/p/' + (p.slug || p.handle || norm(p.name||p.title||'')) + '/'),
      images: images,
      description: p.description || p.body_html || p.body || p.details || '',
      how_to_use: p.how_to_use || p.instructions || '',
      ingredients: p.ingredients || '',
      rating: {
        value: Number(p.rating?.value ?? p.rating ?? 0) || 0,
        count: Number(p.rating?.count ?? p.reviews ?? 0) || 0
      },
      price: { current: Number(priceCurrent)||0, old: priceOld, currency: currency },
      categories: p.categories || p.collection || p.collections || [],
      category: p.category || null,
      tags: p.tags || []
    };
  }

  async function init(){
    const all = await loadAllProducts();
    if (!all || !all.length) return;
    var found = all.find(p => matchBySlug(p, slug));
    if (!found){
      // try loose match
      found = all.find(p => (p.name||p.title||'').toLowerCase().includes(slug.replace(/-/g,' ')));
    }
    if (!found) return;
    window.__CURRENT_PRODUCT__ = normalize(found);

    // Basic SEO tags if present
    try{
      var p = window.__CURRENT_PRODUCT__;
      var t = document.getElementById('og-title'); if (t) t.setAttribute('content', p.title);
      var d = document.getElementById('og-description'); if (d) d.setAttribute('content', (p.description||'').slice(0,160));
      var u = document.getElementById('og-url'); if (u) u.setAttribute('content', location.href);
      var i = document.getElementById('og-image'); if (i && p.images && p.images[0]) i.setAttribute('content', p.images[0]);
      var can = document.getElementById('canonical-link'); if (can) can.setAttribute('href', location.href);
    }catch(e){}
  }

  init();
})();
