
(function(){
  // Run ASAP to prepare __CATEGORY_PRODUCTS__ before collection.js renders
  const match = (location.pathname || '').match(/\/c\/([^\/]+)/i);
  const slug = match ? decodeURIComponent(match[1]).toLowerCase() : '';

  if (!slug) return; // not on a /c/ page

  async function loadAllProducts(){
    try{
      if (window.Storefront && typeof Storefront.getAllProducts === 'function'){
        const r = await Storefront.getAllProducts(); if (Array.isArray(r)) return r;
      }
    }catch(e){}
    try{
      if (window.Storefront && typeof Storefront.getAll === 'function'){
        const r = await Storefront.getAll(); if (Array.isArray(r)) return r;
      }
    }catch(e){}
    try{
      if (window.Storefront && typeof Storefront.getProducts === 'function'){
        const r = await Storefront.getProducts(); if (Array.isArray(r)) return r;
      }
    }catch(e){}
    const globals = ['ALL_PRODUCTS','__ALL_PRODUCTS__','PRODUCTS','__PRODUCTS__','products','catalog','CATALOG'];
    for (var i=0;i<globals.length;i++){
      var key = globals[i]; var val = window[key];
      if (Array.isArray(val)) return val;
    }
    try{
      const resp = await fetch('/assets/data/products.json',{credentials:'same-origin'});
      if (resp.ok){
        const json = await resp.json();
        if (Array.isArray(json)) return json;
        if (Array.isArray(json.products)) return json.products;
      }
    }catch(e){}
    return [];
  }

  function norm(s){
    return String(s||'').toLowerCase().trim()
      .replace(/&/g,'and')
      .replace(/[^a-z0-9]+/g,'-')
      .replace(/^-+|-+$/g,'');
  }

  function hasSlug(obj, slug){
    if (!obj) return false;
    if (typeof obj === 'string') return norm(obj) === slug || obj.toLowerCase() === slug;
    if (obj.slug && norm(obj.slug) === slug) return true;
    if (obj.name && norm(obj.name) === slug) return true;
    if (obj.title && norm(obj.title) === slug) return true;
    return false;
  }

  function inCategory(p, slug){
    // direct keys
    if (hasSlug(p.category, slug)) return true;
    if (norm(p.category_slug) === slug) return true;

    // arrays (strings or objects)
    if (Array.isArray(p.categories)){
      for (var i=0;i<p.categories.length;i++){
        if (hasSlug(p.categories[i], slug)) return true;
      }
    }
    if (Array.isArray(p.collection)){
      for (var j=0;j<p.collection.length;j++){
        if (hasSlug(p.collection[j], slug)) return true;
      }
    }

    // tags matching
    if (Array.isArray(p.tags)){
      for (var k=0;k<p.tags.length;k++){
        const t = p.tags[k];
        if (norm(t) === slug) return true;
      }
    }

    // sometimes a "type" or "product_type"
    if (hasSlug(p.type || p.product_type, slug)) return true;

    return false;
  }

  async function init(){
    const all = await loadAllProducts();
    if (!Array.isArray(all) || !all.length) return;
    const filtered = all.filter(p => inCategory(p, slug));
    // expose for collection.js
    window.__CATEGORY_PRODUCTS__ = filtered;
    // update count/progress if the page already rendered
    if (typeof window.__updateCollectionProgress === 'function'){
      const viewed = Math.min(filtered.length, 12); // first render size
      window.__updateCollectionProgress(viewed, filtered.length);
    }
  }

  // Kick off immediately
  init();
})();
