
/* home-all-products.js — progressive enhancement */
(function(){
  const root = document;
  const grid = root.getElementById('grid-all');
  const loadMoreBtn = root.getElementById('loadMore');
  const progress = root.getElementById('progress');
  if(!grid || !loadMoreBtn || !progress) return;

  async function fetchProducts(){
    try{
      if (window.Storefront && typeof window.Storefront.getAllProducts === 'function'){
        const items = await window.Storefront.getAllProducts();
        return items;
      }
      if (window.Storefront && typeof window.Storefront.getAll === 'function'){
        const items = await window.Storefront.getAll();
        return items;
      }
      if (Array.isArray(window.Products)) return window.Products;
    }catch(e){
      console.warn('Product fetch failed:', e);
    }
    return [];
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
      '<article class=\"pc\">',
        '<div class=\"pc__media\"><img class=\"pc__img\" loading=\"lazy\" alt=\"', escapeHtml(p.title), '\" src=\"', escapeHtml(p.image), '\"></div>',
        '<div class=\"pc__body\">',
          '<h3 class=\"pc__title\">', escapeHtml(p.title), '</h3>',
          '<div class=\"pc__price\">PKR ', price, '</div>',
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
