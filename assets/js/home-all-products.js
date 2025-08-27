
/* home-all-products.js — adaptive wiring to existing data */
(function(){
  const root = document;
  const grid = root.getElementById('grid-all');
  const loadMoreBtn = root.getElementById('loadMore');
  const progress = root.getElementById('progress');
  if(!grid || !loadMoreBtn || !progress) return;

  async function fetchProducts(){
    // 1) Preferred: Storefront helpers
    try{
      if (window.Storefront && typeof window.Storefront.getAllProducts === 'function'){
        const items = await window.Storefront.getAllProducts();
        if (Array.isArray(items) && items.length) return items;
      }
      if (window.Storefront && typeof window.Storefront.getAll === 'function'){
        const items = await window.Storefront.getAll();
        if (Array.isArray(items) && items.length) return items;
      }
    }catch(e){ console.warn('Storefront fetch failed', e); }

    // 2) Globals
    if (Array.isArray(window.__ALL_PRODUCTS__) && window.__ALL_PRODUCTS__.length) return window.__ALL_PRODUCTS__;
    if (Array.isArray(window.Products) && window.Products.length) return window.Products;

    // 3) Try common JSON endpoints (static sites)
    for (const url of ['/assets/data/products.json','/data/products.json']){
      try{
        const res = await fetch(url, {credentials:'omit', cache:'force-cache'});
        if (res.ok){
          const items = await res.json();
          if (Array.isArray(items) && items.length) return items;
        }
      }catch(e){ /* ignore */ }
    }

    // 4) DOM fallback: scrape existing product cards from the page (outside .home-enhanced)
    const candidates = Array.from(document.querySelectorAll('.product-grid .pc, .products .pc, [data-product-id]'))
      .filter(el => !el.closest('.home-enhanced')); // avoid our own grid
    if (candidates.length){
      return candidates.map(el => ({
        id: el.getAttribute('data-product-id') || '',
        title: (el.querySelector('.pc__title')?.textContent || el.getAttribute('data-title') || 'Product').trim(),
        price: parsePrice(el.querySelector('.pc__price')?.textContent || el.getAttribute('data-price') || ''),
        image: el.querySelector('img')?.getAttribute('src') || el.getAttribute('data-image') || '/assets/img/placeholder.webp'
      }));
    }

    return [];
  }

  function parsePrice(txt){
    if (!txt) return 0;
    // strip non-digits except dot/comma
    const n = String(txt).replace(/[^\d.,]/g,'').replace(/,/g,'');
    const v = parseFloat(n);
    return isFinite(v) ? v : 0;
  }

  function mapProduct(p){
    return {
      id: p.id || p._id || p.slug || '',
      title: p.title || p.name || 'Product',
      price: Number(p.price || p.amount || (p.pricing && p.pricing.price) || 0),
      image: (Array.isArray(p.images) && p.images[0]) || p.image || p.thumbnail || '/assets/img/placeholder.webp'
    };
  }

  function escapeHtml(s){ return String(s).replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c])); }

  function tpl(p){
    const price = isFinite(p.price) ? p.price.toLocaleString('en-PK') : '—';
    return [
      '<article class="pc">',
        '<div class="pc__media"><img class="pc__img" loading="lazy" alt="', escapeHtml(p.title), '" src="', escapeHtml(p.image), '"></div>',
        '<div class="pc__body">',
          '<h3 class="pc__title">', escapeHtml(p.title), '</h3>',
          '<div class="pc__price">PKR ', price, '</div>',
        '</div>',
      '</article>'
    ].join('');
  }

  let all = [];
  let visible = 8;

  function render(){
    grid.innerHTML = all.slice(0, visible).map(tpl).join('');
    progress.textContent = `You’ve viewed ${Math.min(visible, all.length)} of ${all.length} products`;
    loadMoreBtn.style.display = (visible >= all.length || all.length === 0) ? 'none' : 'inline-block';
  }

  loadMoreBtn.addEventListener('click', function(){
    visible += 8;
    render();
  });

  fetchProducts().then(items => {
    all = (items || []).map(mapProduct);
    render();
  });
})();
