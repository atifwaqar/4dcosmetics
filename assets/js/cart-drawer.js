(function(global){
  const fmt = n => (global.moneyPKR ? global.moneyPKR(n) : new Intl.NumberFormat('en-PK',{style:'currency',currency:'PKR',maximumFractionDigits:0}).format(n));
  const focusableSel = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])';
  let options = {};
  let root, panel, linesEl, subtotalEl, liveRegion;
  let lastFocus;
  let autoTimer;

  function build(){
    const linesId = document.getElementById('cart-lines') ? 'cart-lines-drawer' : 'cart-lines';
    root = document.createElement('div');
    root.className = 'cart-drawer';
    root.hidden = true;
    root.innerHTML = `
      <div class="cart-drawer__backdrop" data-close></div>
      <aside class="cart-drawer__panel" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title">
        <header class="cart-drawer__header">
          <h2 id="cart-drawer-title">Added to your cart</h2>
          <button type="button" class="cart-drawer__close" aria-label="Close" data-close>&times;</button>
        </header>
        <div class="cart-drawer__body">
          <div id="${linesId}" class="cart-lines"></div>
        </div>
        <footer class="cart-drawer__footer">
          <div class="cart-drawer__subtotal"><span>Subtotal</span><span id="cart-drawer-subtotal">—</span></div>
          <a class="cart-drawer__checkout" href="${options.checkoutUrl}">Checkout</a>
          <a class="cart-drawer__view" href="${options.viewCartUrl}">View cart</a>
          <button type="button" class="cart-drawer__continue" data-close>Continue shopping</button>
        </footer>
      </aside>
      <div class="visually-hidden" aria-live="polite" id="cart-drawer-live"></div>
    `;
    document.body.appendChild(root);
    panel = root.querySelector('.cart-drawer__panel');
    linesEl = root.querySelector('.cart-lines');
    subtotalEl = root.querySelector('#cart-drawer-subtotal');
    liveRegion = root.querySelector('#cart-drawer-live');

    root.addEventListener('click', async (e)=>{
      if(e.target.closest('[data-close]')){ close(); return; }
      const dec = e.target.closest('[data-dec]');
      if(dec){
        const id = dec.dataset.dec;
        const input = linesEl.querySelector(`input[data-qty="${id}"]`);
        const newQty = Math.max(1, (parseInt(input.value,10)||1)-1);
        await options.updateQty(id, newQty);
        refresh();
        return;
      }
      const inc = e.target.closest('[data-inc]');
      if(inc){
        const id = inc.dataset.inc;
        const input = linesEl.querySelector(`input[data-qty="${id}"]`);
        const newQty = Math.max(1, (parseInt(input.value,10)||1)+1);
        await options.updateQty(id, newQty);
        refresh();
        return;
      }
      const del = e.target.closest('[data-del]');
      if(del){
        await options.removeLineItem(del.dataset.del);
        refresh();
      }
    });

    root.addEventListener('change', async (e)=>{
      const qty = e.target.closest('input[data-qty]');
      if(qty){
        const id = qty.dataset.qty;
        const val = Math.max(1, parseInt(qty.value,10)||1);
        await options.updateQty(id, val);
        refresh();
      }
    });

    panel.addEventListener('keydown', (e)=>{
      if(e.key === 'Escape'){ close(); return; }
      if(e.key === 'Tab'){
        const focusables = panel.querySelectorAll(focusableSel);
        if(!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length-1];
        if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
        else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
      }
    });
  }

  async function refresh(){
    const state = await options.getCartState();
    linesEl.innerHTML = state.items.map(lineTemplate).join('');
    subtotalEl.textContent = fmt(state.subtotal || 0);
  }

  function lineTemplate(it){
    const total = (Number(it.price)||0) * (Number(it.qty)||0);
    return `
      <div class="cart-line" data-id="${it.id}">
        <div class="cart-line__img">${it.image ? `<img src="${it.image}" alt="">` : ''}</div>
        <div>
          <p class="cart-line__title">${it.title}</p>
          <p class="cart-line__meta">${it.variantTitle||''}</p>
          <div class="cart-line__qty">
            <button class="btn btn-outline-secondary" data-dec="${it.id}">−</button>
            <input type="number" min="1" value="${it.qty}" data-qty="${it.id}">
            <button class="btn btn-outline-secondary" data-inc="${it.id}">+</button>
            <button class="btn btn-link text-danger" data-del="${it.id}">Remove</button>
          </div>
        </div>
        <div class="cart-line__total">${fmt(total)}</div>
      </div>`;
  }

  async function open(){
    lastFocus = document.activeElement;
    root.hidden = false;
    requestAnimationFrame(()=>{ root.classList.add('open'); });
    liveRegion.textContent = 'Added to your cart';
    await refresh();
    const first = panel.querySelector(focusableSel);
    first && first.focus();
    if(global.matchMedia && global.matchMedia('(min-width:769px)').matches){
      clearTimeout(autoTimer); autoTimer = setTimeout(close, 7000);
    }
  }

  function close(){
    clearTimeout(autoTimer);
    root.classList.remove('open');
    const handler = ()=>{
      root.hidden = true;
      root.removeEventListener('transitionend', handler);
      lastFocus && lastFocus.focus();
    };
    root.addEventListener('transitionend', handler);
  }

  function init(opts={}){
    options = Object.assign({
      getCartState: opts.getCartState,
      updateQty: opts.updateQty,
      removeLineItem: opts.removeLineItem,
      viewCartUrl: opts.viewCartUrl || '/cart.html',
      checkoutUrl: opts.checkoutUrl || '/checkout'
    }, options);
    if(global.cartApi){
      options.getCartState = options.getCartState || global.cartApi.getCartState;
      options.updateQty = options.updateQty || global.cartApi.updateQty;
      options.removeLineItem = options.removeLineItem || global.cartApi.removeLineItem;
    }
    build();
  }

  global.CartDrawer = { init, open, close };

  document.addEventListener('product:addToCart', ()=> open());

})(window);
