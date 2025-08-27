
/* home-all-products.js (v2 full) — adaptive data + hp-card template */
(function(){
  const root = document;
  const grid = root.getElementById('grid-all');
  const loadMoreBtn = root.getElementById('loadMore');
  const progress = root.getElementById('progress');
  if(!grid || !loadMoreBtn || !progress) return;

  async function fetchProducts(){
    try{
      if (window.Storefront && typeof window.Storefront.getAllProducts === 'function'){
        const a = await window.Storefront.getAllProducts(); if (Array.isArray(a) && a.length) return a;
      }
      if (window.Storefront && typeof window.Storefront.getAll === 'function'){
        const b = await window.Storefront.getAll(); if (Array.isArray(b) && b.length) return b;
      }
    }catch(e){ console.warn('Storefront fetch failed', e); }

    if (Array.isArray(window.__ALL_PRODUCTS__) && window.__ALL_PRODUCTS__.length) return window.__ALL_PRODUCTS__;
    if (Array.isArray(window.Products) && window.Products.length) return window.Products;

    for (const url of ['assets/data/products.json','data/products.json']){
      try{ const r = await fetch(url); if (r.ok){ const j = await r.json(); if (Array.isArray(j) && j.length) return j; } }catch(e){}
    }

    const nodes = Array.from(document.querySelectorAll('.product-grid .pc, .products .pc, [data-product-id]'))
      .filter(el => !el.closest('.home-enhanced'));
    if (nodes.length){
      return nodes.map(el => ({
        id: el.getAttribute('data-product-id') || '',
        title: (el.querySelector('.pc__title')?.textContent || el.getAttribute('data-title') || 'Product').trim(),
        price: parsePrice(el.querySelector('.pc__price')?.textContent || el.getAttribute('data-price') || ''),
        image: el.querySelector('img')?.getAttribute('src') || el.getAttribute('data-image') || 'assets/img/placeholder.webp'
      }));
    }
    return [];
  }

  function parsePrice(txt){
    if (!txt) return 0;
    const n = String(txt).replace(/[^\d.,]/g,'').replace(/,/g,'');
    const v = parseFloat(n);
    return isFinite(v) ? v : 0;
  }

  function mapProduct(p){
    return {
      id: p.id || p._id || p.slug || '',
      title: p.title || p.name || 'Product',
      price: Number(p.price || p.amount || (p.pricing && p.pricing.price) || 0),
      image: (Array.isArray(p.images) && p.images[0]) || p.image || p.thumbnail || 'assets/img/placeholder.webp'
    };
  }

  function esc(s){ return String(s).replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c])); }

  function tpl(p){
    const price = isFinite(p.price) ? p.price.toLocaleString('en-PK') : '—';
    return [
      '<article class="hp-card">',
        '<div class="hp-card__media"><img class="hp-card__img" loading="lazy" alt="', esc(p.title), '" src="', esc(p.image), '"></div>',
        '<div class="hp-card__body">',
          '<h3 class="hp-card__title">', esc(p.title), '</h3>',
          '<div class="hp-card__price">PKR ', price, '</div>',
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
  loadMoreBtn.addEventListener('click', function(){ visible += 8; render(); });

  fetchProducts().then(items => { all = (items || []).map(mapProduct); render(); });
})();
