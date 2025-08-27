
/* home-all-products.js (v3) — adopt existing products into Canvas block */
(function(){
  const grid = document.getElementById('grid-all');
  const loadMoreBtn = document.getElementById('loadMore');
  const progress = document.getElementById('progress');
  if(!grid || !loadMoreBtn || !progress) return;

  function parsePrice(txt){
    if (!txt) return 0;
    const n = String(txt).replace(/[^\d.,]/g,'').replace(/,/g,'');
    const v = parseFloat(n);
    return isFinite(v) ? v : 0;
  }
  function esc(s){ return String(s).replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c])); }
  function mapProduct(p){
    return {
      id: p.id || p._id || p.slug || '',
      title: p.title || p.name || 'Product',
      price: Number(p.price || p.amount || (p.pricing && p.pricing.price) || 0),
      image: (Array.isArray(p.images) && p.images[0]) || p.image || p.thumbnail || 'assets/img/placeholder.webp'
    };
  }
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

  async function fetchProductsPreferred(){
    try{
      if (window.Storefront && typeof window.Storefront.getAllProducts === 'function'){
        const a = await window.Storefront.getAllProducts(); if (Array.isArray(a) && a.length) return a;
      }
      if (window.Storefront && typeof window.Storefront.getAll === 'function'){
        const b = await window.Storefront.getAll(); if (Array.isArray(b) && b.length) return b;
      }
    }catch(e){}
    if (Array.isArray(window.__ALL_PRODUCTS__) && window.__ALL_PRODUCTS__.length) return window.__ALL_PRODUCTS__;
    if (Array.isArray(window.Products) && window.Products.length) return window.Products;
    for (const url of ['assets/data/products.json','data/products.json']){
      try{ const r = await fetch(url); if (r.ok){ const j = await r.json(); if (Array.isArray(j) && j.length) return j; } }catch(e){}
    }
    return [];
  }

  function scrapeBelowHome(){
    const home = document.querySelector('.home-enhanced');
    if (!home) return { items: [], container: null };
    const siblings = Array.from(document.querySelectorAll('.home-enhanced ~ *'));
    // find a container that has lots of product-like tiles
    let best = null, bestScore = 0;
    for (const el of siblings){
      const imgs = el.querySelectorAll('img');
      const tiles = el.querySelectorAll('.pc, .product, .card, [data-product-id], [class*=\"product-card\"], [class*=\"productItem\"], [class*=\"grid-item\"]');
      const score = tiles.length * 2 + imgs.length;
      if (score > bestScore && tiles.length >= 6){ best = el; bestScore = score; }
      // stop if we've gone too far
      if (bestScore > 0 && siblings.indexOf(el) > 12) break;
    }
    if (!best) return { items: [], container: null };
    const tiles = best.querySelectorAll('.pc, .product, .card, [data-product-id], [class*=\"product-card\"], [class*=\"productItem\"], [class*=\"grid-item\"]');
    const items = Array.from(tiles).map(el => ({
      id: el.getAttribute('data-product-id') || '',
      title: (el.querySelector('.pc__title, .title, .product-title, h3, h2')?.textContent || el.getAttribute('data-title') || el.querySelector('img')?.getAttribute('alt') || 'Product').trim(),
      price: parsePrice(el.querySelector('.pc__price, .price, [class*=\"price\"]')?.textContent || el.getAttribute('data-price') || ''),
      image: el.querySelector('img')?.getAttribute('src') || el.getAttribute('data-image') || 'assets/img/placeholder.webp'
    }));
    return { items, container: best };
  }

  let all = [];
  let visible = 8;

  function render(){
    if (!all.length){
      grid.innerHTML = '';
      loadMoreBtn.style.display = 'none';
      progress.textContent = '';
      return;
    }
    grid.innerHTML = all.slice(0, visible).map(tpl).join('');
    progress.textContent = `You’ve viewed ${Math.min(visible, all.length)} of ${all.length} products`;
    loadMoreBtn.style.display = (visible >= all.length) ? 'none' : 'inline-block';
  }

  loadMoreBtn.addEventListener('click', function(){ visible += 8; render(); });

  (async function init(){
    // 1) Try APIs/globals/json
    let items = await fetchProductsPreferred();
    let containerToHide = null;

    // 2) If empty, scrape from the first grid below our section
    if (!items.length){
      const scraped = scrapeBelowHome();
      items = scraped.items;
      containerToHide = scraped.container;
    }

    // 3) If we scraped, hide the old container (grid, progress, load more)
    if (containerToHide){
      containerToHide.style.display = 'none';
      // Also hide any immediate progress bars or load-more near it
      const near = containerToHide.nextElementSibling;
      if (near && /viewed|load more/i.test(near.textContent)) near.style.display = 'none';
    }

    all = (items || []).map(mapProduct);
    render();
  })();
})();
