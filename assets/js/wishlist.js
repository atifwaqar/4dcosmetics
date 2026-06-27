(function(){
  // Wishlist storage is owned by the shared Wishlist module (config.js).
  const loadWishlist = () => Wishlist.list();
  function getId(raw){
    return String(raw.id || raw.item_id || raw.sku || raw.handle || raw.slug || raw._id || '');
  }
  async function loadAllProducts(){
    try{
      if(window.Storefront && typeof Storefront.getAllProducts === 'function'){
        const r = await Storefront.getAllProducts();
        if(Array.isArray(r) && r.length) return r;
      }
    }catch(e){}
    try{
      if(window.Storefront && typeof Storefront.getAll === 'function'){
        const r = await Storefront.getAll();
        if(Array.isArray(r) && r.length) return r;
      }
    }catch(e){}
    try{
      if(window.Storefront && typeof Storefront.getProducts === 'function'){
        const r = await Storefront.getProducts();
        if(Array.isArray(r) && r.length) return r;
      }
    }catch(e){}
    const globals = ['ALL_PRODUCTS','__ALL_PRODUCTS__','PRODUCTS','__PRODUCTS__','products','catalog','CATALOG'];
    for(let i=0;i<globals.length;i++){
      const key = globals[i];
      if(Array.isArray(window[key]) && window[key].length) return window[key];
    }
    if(window.data && Array.isArray(window.data.products) && window.data.products.length){
      return window.data.products;
    }
    try{
      const resp = await fetch('/assets/data/products.json',{credentials:'same-origin'});
      if(resp.ok){
        const json = await resp.json();
        if(Array.isArray(json)) return json;
        if(Array.isArray(json.products)) return json.products;
      }
    }catch(e){}
    return [];
  }

  document.addEventListener('DOMContentLoaded', async function(){
    const grid = document.getElementById('wishlist-grid');
    const empty = document.getElementById('wishlist-empty');
    const ids = loadWishlist();
    if(!ids.length){ empty.hidden = false; return; }
    const all = await loadAllProducts();
    const map = {};
    all.forEach(p=>{ map[getId(p)] = p; });
    const items = ids.map(id=>map[id]).filter(Boolean);
    if(!items.length){ empty.hidden = false; return; }
    grid.innerHTML = items.map(p=> window.ProductCard.renderProductCard(p)).join('');

    document.addEventListener('click', function(e){
      const wish = e.target.closest('.pc__wish');
      if(!wish) return;
      const id = wish.getAttribute('data-id');
      if(!loadWishlist().includes(id)){
        const card = wish.closest('.pc');
        if(card) card.remove();
        if(!grid.querySelector('.pc')) empty.hidden = false;
      }
    });
  });
})();
