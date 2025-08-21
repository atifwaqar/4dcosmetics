(function(){
  const listEl = document.getElementById('cart-lines');
  const subtotalEl = document.getElementById('cart-subtotal');

  function fmt(n){ return (window.ProductCard?.formatPrice ? ProductCard.formatPrice(n, 'PKR') : (n||0)); }

  function render(){
    try{
      const items = (typeof simpleCart !== 'undefined' ? simpleCart.items() : []) || [];
      if(!items.length){
        listEl.innerHTML = `<div class="cart-empty">Your cart is empty. <a href="/c/">Browse products</a></div>`;
        subtotalEl.textContent = fmt(0);
        return;
      }
      listEl.innerHTML = items.map(it=>{
        const img = it.get('image') || '';
        const title = it.get('name');
        const qty = it.quantity();
        const price = Number(it.get('price')||0);
        const total = qty * price;
        return `
          <div class="cart-line">
            <div class="cart-line__img">${img? `<img src="${img}" alt="">` : ''}</div>
            <div>
              <p class="cart-line__title">${title}</p>
              <p class="cart-line__meta">${it.get('variant')||''}</p>
              <div class="cart-line__qty">
                <button class="btn btn-outline-secondary" data-dec="${it.id()}">−</button>
                <input type="number" min="1" value="${qty}" data-qty="${it.id()}">
                <button class="btn btn-outline-secondary" data-inc="${it.id()}">+</button>
                <button class="btn btn-link text-danger" data-del="${it.id()}">Remove</button>
              </div>
            </div>
            <div class="cart-line__total">${fmt(total)}</div>
          </div>`;
      }).join('');
      subtotalEl.textContent = fmt(items.reduce((s,it)=> s + (Number(it.get('price')||0)* it.quantity()), 0));
    }catch(e){ console.warn(e); }
  }

  document.addEventListener('click', (e)=>{
    const dec = e.target.closest('[data-dec]'); if(dec){ simpleCart.find(dec.dataset.dec).decrement(); render(); }
    const inc = e.target.closest('[data-inc]'); if(inc){ simpleCart.find(inc.dataset.inc).increment(); render(); }
    const del = e.target.closest('[data-del]'); if(del){ simpleCart.find(del.dataset.del).remove(); render(); }
  });
  document.addEventListener('change', (e)=>{
    const qty = e.target.closest('input[data-qty]'); if(qty){
      const item = simpleCart.find(qty.dataset.qty); item.set('quantity', Math.max(1, Number(qty.value)||1)); render();
    }
  });

  if(typeof simpleCart !== 'undefined'){
    simpleCart.bind('ready', render);
    simpleCart.bind('afterAdd', render);
    simpleCart.bind('update', render);
    simpleCart.bind('remove', render);
  }
  render();
})();
