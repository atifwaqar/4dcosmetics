
(function(){
  const fmt = n => moneyPKR ? moneyPKR(n) : new Intl.NumberFormat('en-PK',{style:'currency',currency:'PKR', maximumFractionDigits:0}).format(n);

  function getItems(){
    try{ if (typeof simpleCart !== 'undefined') return simpleCart.items() || []; }catch(_){}
    return [];
  }

  const tbody = document.getElementById('cz-cart-body');
  const cards = document.getElementById('cz-cart-cards');

  function rowTemplate(it){
    const id = it.id();
    const name = it.get('name');
    const price = Number(it.get('price'))||0;
    const qty = Number(it.quantity())||1;
    const img = it.get('image')||'/assets/img/placeholder.png';
    return `
    <div class="cz-cart__row" role="row" data-id="${id}">
      <div class="cz-cart__cell cz-cart__prod" role="cell">
        <img class="cz-cart__img" src="${img}" alt="">
        <div class="cz-name">${name}</div>
      </div>
      <div class="cz-cart__cell cz-price" role="cell">${fmt(price)}</div>
      <div class="cz-cart__cell" role="cell">
        <div class="cz-qty" aria-label="Quantity">
          <button type="button" data-dec="${id}" aria-label="Decrease">−</button>
          <input type="number" min="1" value="${qty}" inputmode="numeric" data-qty="${id}" />
          <button type="button" data-inc="${id}" aria-label="Increase">+</button>
        </div>
      </div>
      <div class="cz-cart__cell cz-sub" role="cell">${fmt(price*qty)}</div>
      <div class="cz-cart__cell" role="cell">
        <button class="btn btn-link p-0 cz-remove" data-del="${id}" aria-label="Remove"><i class="fa fa-xmark"></i></button>
      </div>
    </div>`;
  }

  function cardTemplate(it){
    const id = it.id();
    const name = it.get('name');
    const price = Number(it.get('price'))||0;
    const qty = Number(it.quantity())||1;
    const img = it.get('image')||'/assets/img/placeholder.png';
    return `
    <div class="cz-card" data-id="${id}">
      <div style="display:flex;gap:12px">
        <img class="cz-cart__img" src="${img}" alt="">
        <div style="flex:1">
          <div class="cz-name" style="font-weight:600">${name}</div>
          <div class="cz-price">${fmt(price)}</div>
        </div>
        <button class="btn btn-link p-0 cz-remove" data-del="${id}" aria-label="Remove"><i class="fa fa-xmark"></i></button>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
        <div class="cz-qty">
          <button type="button" data-dec="${id}" aria-label="Decrease">−</button>
          <input type="number" min="1" value="${qty}" inputmode="numeric" data-qty="${id}" />
          <button type="button" data-inc="${id}" aria-label="Increase">+</button>
        </div>
        <div class="cz-sub" aria-label="Subtotal">${fmt(price*qty)}</div>
      </div>
    </div>`;
  }

  function render(){
    const items = getItems();
    if (!items.length){
      tbody.innerHTML = '';
      cards.innerHTML = '<div class="cz-card">Your cart is empty.</div>';
    }else{
      tbody.innerHTML = items.map(rowTemplate).join('');
      cards.innerHTML = items.map(cardTemplate).join('');
    }
    recalc();
  }

  function recalc(){
    const items = getItems();
    const subtotal = items.reduce((s,it)=> s + (Number(it.get('price')||0) * it.quantity()), 0);
    const ship = Number((document.querySelector('input[name="ship"]:checked')||{}).value||0);
    const code = (document.getElementById('cz-coupon')?.value || localStorage.getItem('cart_coupon') || '').trim().toUpperCase();
    let discount = 0;
    if (code === 'WELCOME10') discount = 0.10 * subtotal;
    const total = Math.max(0, subtotal - discount) + ship;
    document.getElementById('cz-subtotal').textContent = fmt(subtotal);
    document.getElementById('cz-total').textContent = fmt(total);
  }

  // Event wiring (delegate)
  document.addEventListener('click', (e)=>{
    const dec = e.target.closest('[data-dec]'); if(dec){ simpleCart.find(dec.getAttribute('data-dec')).decrement(); render(); }
    const inc = e.target.closest('[data-inc]'); if(inc){ simpleCart.find(inc.getAttribute('data-inc')).increment(); render(); }
    const del = e.target.closest('[data-del]'); if(del){ simpleCart.find(del.getAttribute('data-del')).remove(); render(); }
    if (e.target && e.target.id === 'cz-apply-coupon'){
      const field = document.getElementById('cz-coupon');
      if(field){ localStorage.setItem('cart_coupon', (field.value||'').trim().toUpperCase()); }
      document.getElementById('cz-coupon-msg').textContent = field && field.value ? 'Coupon stored.' : '';
      render();
    }
  });

  document.addEventListener('change', (e)=>{
    const qty = e.target.closest('input[data-qty]');
    if(qty){
      const id = qty.getAttribute('data-qty');
      const it = simpleCart.find(id);
      const val = Math.max(1, parseInt(qty.value||'1',10));
      it.quantity(val);
      render();
    }
    if (e.target && e.target.name === 'ship'){ recalc(); }
  });

  // Keep in sync with global cart updates
  try{
    simpleCart.bind('update', render);
    simpleCart.bind('remove', render);
    simpleCart.bind('afterAdd', render);
  }catch(_){}

  document.addEventListener('DOMContentLoaded', ()=>{
    const stored = localStorage.getItem('cart_coupon');
    if (stored && document.getElementById('cz-coupon')){
      document.getElementById('cz-coupon').value = stored;
    }
    render();
  });
})();