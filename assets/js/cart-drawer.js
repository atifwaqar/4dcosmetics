// Cart Drawer module
// Provides a slide-in mini cart drawer UI. Keeps existing cart logic intact.
// Public API:
// CartDrawer.init({ getCartState, updateQty, removeLineItem, undoLastAdd, checkoutUrl, viewCartUrl, onOpen, onClose, getProductById })
// CartDrawer.open({ itemId, qty })
// CartDrawer.update(cartState)
// CartDrawer.close({ returnFocusTo } = {})
// CartDrawer.bumpCartIcon()

const CartDrawer = (() => {
  let opts = {};
  let root, backdrop, panel, itemsEl, subtotalEl, liveEl;
  let isOpen = false;
  let lastTrigger = null;
  let lastAdded = null;
  let undoStack = [];
  let autoTimer = null;

  function init(options = {}) {
    if (root) return CartDrawer;
    opts = options;
    build();
    document.addEventListener('product:addToCart', e => {
      const d = e.detail || {};
      open({ itemId: d.productId || d.id, qty: d.qty || 1 });
    });
    return CartDrawer;
  }

  function build() {
    root = document.createElement('div');
    root.className = 'cd__root';
    root.innerHTML = `
      <div class="cd__backdrop" hidden></div>
      <aside class="cd__panel" role="dialog" aria-modal="true" aria-labelledby="cd_header" hidden>
        <div class="cd__header"><span id="cd_header">Added to your cart</span><button class="cd__close" data-cd-close aria-label="Close">×</button></div>
        <div class="cd__error" hidden></div>
        <div class="cd__items"></div>
        <div class="cd__footer">
          <div class="cd__subtotal">Subtotal: <span class="cd__subtotal-val">0</span></div>
          <button class="cd__undo cd__btn" data-cd-undo hidden>Undo</button>
          <a class="cd__btn cd__btn--primary" data-cd-checkout href="#">Checkout</a>
          <a class="cd__btn" data-cd-view href="#">View cart</a>
          <button class="cd__link" data-cd-close>Continue shopping</button>
        </div>
      </aside>
      <div class="sr-only" aria-live="polite" aria-atomic="true" id="cd_aria_live"></div>
    `;
    document.body.appendChild(root);
    backdrop = root.querySelector('.cd__backdrop');
    panel = root.querySelector('.cd__panel');
    itemsEl = panel.querySelector('.cd__items');
    subtotalEl = panel.querySelector('.cd__subtotal-val');
    liveEl = root.querySelector('#cd_aria_live');

    panel.querySelector('[data-cd-checkout]').href = opts.checkoutUrl || '/checkout';
    panel.querySelector('[data-cd-view]').href = opts.viewCartUrl || '/cart';

    backdrop.addEventListener('click', () => {
      if (window.matchMedia('(min-width:769px)').matches) close();
      else close();
    });
    panel.addEventListener('click', e => {
      if (e.target.matches('[data-cd-close]')) { e.preventDefault(); close({ returnFocusTo: lastTrigger }); }
      if (e.target.matches('[data-cd-undo]')) { e.preventDefault(); undo(); }
      if (e.target.matches('.cd__qty-btn')) handleQty(e.target);
      if (e.target.matches('.cd__remove')) handleRemove(e.target);
    });
    document.addEventListener('keydown', e => {
      if (!isOpen) return;
      if (e.key === 'Escape') { e.preventDefault(); close({ returnFocusTo: lastTrigger }); }
    });
  }

  function focusTrap(e){
    if (!isOpen || e.key !== 'Tab') return;
    const focusables = panel.querySelectorAll('a,button,input');
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length-1];
    if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  }

  document.addEventListener('keydown', focusTrap);

  function handleQty(btn){
    const id = btn.closest('.cd__item').dataset.id;
    const input = btn.closest('.cd__qty').querySelector('.cd__qty-input');
    let val = Number(input.value)||1;
    if (btn.dataset.dec) val = Math.max(1, val-1);
    if (btn.dataset.inc) val = val+1;
    input.value = val;
    opts.updateQty && opts.updateQty(id, val).then(refresh).catch(()=>showLineError(id));
  }

  function handleRemove(btn){
    const id = btn.closest('.cd__item').dataset.id;
    opts.removeLineItem && opts.removeLineItem(id).then(refresh).catch(()=>showLineError(id));
  }

  function showLineError(id){
    const row = itemsEl.querySelector(`[data-id="${id}"]`);
    if(row) row.classList.add('cd__item--error');
  }

  function undo(){
    const last = undoStack.pop();
    if(!last) return;
    if(opts.undoLastAdd){ opts.undoLastAdd().then(refresh); return; }
    // fallback: decrement or remove
    opts.updateQty && opts.updateQty(last.lineId, Math.max(0, last.qty-1)).then(refresh);
  }

  function announce(text){ if(liveEl) liveEl.textContent = text; }

  async function refresh(){
    const state = opts.getCartState ? await opts.getCartState() : {items:[],subtotal:0};
    update(state);
  }

  function renderItems(items){
    itemsEl.innerHTML = items.map(it=>`
      <div class="cd__item" data-id="${it.id}">
        <img src="${it.image}" alt="" class="cd__item-img"/>
        <div class="cd__item-info">
          <p class="cd__item-title">${it.title}</p>
          ${it.variantTitle? `<p class="cd__item-variant">${it.variantTitle}</p>`:''}
          <p class="cd__item-price">${formatMoney(it.price)}</p>
          <div class="cd__qty">
            <button class="cd__qty-btn" data-dec>-</button>
            <input class="cd__qty-input" type="number" min="1" value="${it.qty}">
            <button class="cd__qty-btn" data-inc>+</button>
          </div>
        </div>
        <button class="cd__remove" aria-label="Remove">×</button>
      </div>
    `).join('');
  }

  function formatMoney(v){
    try{ return window.moneyPKR ? moneyPKR(v) : v; }catch{return v;}
  }

  function update(cart){
    renderItems(cart.items||[]);
    subtotalEl.textContent = formatMoney(cart.subtotal||0);
    if(lastAdded){
      const row = itemsEl.querySelector(`[data-id="${lastAdded}"]`);
      if(row){ row.classList.add('cd__item--new'); setTimeout(()=>row.classList.remove('cd__item--new'),300); }
    }
  }

  async function open({ itemId, qty }){
    lastTrigger = document.activeElement;
    lastAdded = itemId;
    isOpen = true;
    panel.hidden = false;
    backdrop.hidden = false;
    panel.classList.add('open');
    backdrop.classList.add('open');
    announce('Added to your cart');
    bumpCartIcon();
    if(opts.onOpen) opts.onOpen();
    await refresh();
    const focusable = panel.querySelector('a,button,input');
    focusable && focusable.focus();
    if(window.matchMedia('(min-width:769px)').matches){
      clearTimeout(autoTimer);
      autoTimer = setTimeout(()=>{ if(isOpen) close(); },7000);
    }
    document.dispatchEvent(new CustomEvent('cartdrawer:opened',{detail:{source:'add_to_cart'}}));
  }

  function close({ returnFocusTo } = {}){
    isOpen = false;
    panel.classList.remove('open');
    backdrop.classList.remove('open');
    setTimeout(()=>{ panel.hidden = true; backdrop.hidden = true; },200);
    clearTimeout(autoTimer);
    if(opts.onClose) opts.onClose();
    if(returnFocusTo){ try{ returnFocusTo.focus(); }catch{} }
  }

  function bumpCartIcon(){
    const icon = document.querySelector('[data-cart-icon]');
    const badge = document.querySelector('[data-cart-badge]');
    if(icon){ icon.classList.add('cd__icon-bump'); setTimeout(()=>icon.classList.remove('cd__icon-bump'),300); }
    if(badge){ badge.classList.add('cd__icon-bump'); setTimeout(()=>badge.classList.remove('cd__icon-bump'),300); }
  }

  return { init, open, update, close, bumpCartIcon };
})();

export { CartDrawer };

