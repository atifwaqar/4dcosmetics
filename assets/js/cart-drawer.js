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
    console.debug('[CartDrawer] initialized');
    document.addEventListener('product:addToCart', e => {
      const d = e.detail || {};
      open({ itemId: d.productId || d.id, qty: d.qty || 1 });
    });
    return CartDrawer;
  }

  function build() {
    const listId = document.getElementById('cart-lines') ? 'cart-lines-drawer' : 'cart-lines';
    root = document.createElement('div');
    root.className = 'cd__root';
    root.innerHTML = `
      <div class="cd__backdrop" hidden></div>
      <aside class="cd__panel" role="dialog" aria-modal="true" aria-labelledby="cd_header" hidden>
        <div class="cd__header"><span id="cd_header">Added to your cart</span><button class="cd__close btn-reset" data-cd-close aria-label="Close">×</button></div>
        <div class="cd__error" hidden></div>
        <div class="cd__items">
          <div id="${listId}" class="cart-lines cart-lines--drawer"></div>
        </div>
        <div class="cd__footer">
          <div class="cd__subtotal">Subtotal: <span class="cd__subtotal-val">0</span></div>
          <button class="cd__undo cd__btn btn-reset" data-cd-undo hidden>Undo</button>
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
    itemsEl = panel.querySelector(`#${listId}`);
    subtotalEl = panel.querySelector('.cd__subtotal-val');
    liveEl = root.querySelector('#cd_aria_live');

    panel.querySelector('[data-cd-checkout]').href = opts.checkoutUrl || '/checkout';
    panel.querySelector('[data-cd-view]').href = opts.viewCartUrl || '/cart';

    backdrop.addEventListener('click', () => { close({ returnFocusTo: lastTrigger }); });
    panel.addEventListener('click', e => {
      const t = e.target;
      if (t.matches('[data-cd-close]')) { e.preventDefault(); close({ returnFocusTo: lastTrigger }); }
      else if (t.matches('[data-cd-undo]')) { e.preventDefault(); undo(); }
      else if (t.closest('[data-dec]')) { handleQty(t.closest('[data-dec]')); }
      else if (t.closest('[data-inc]')) { handleQty(t.closest('[data-inc]')); }
      else if (t.closest('[data-del]')) { handleRemove(t.closest('[data-del]')); }
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
    const id = btn.dataset.dec || btn.dataset.inc;
    const row = itemsEl.querySelector(`.cart-line[data-id="${id}"]`);
    const input = row.querySelector('input[type="number"]');
    let val = Number(input.value) || 1;
    if (btn.dataset.dec) val = Math.max(1, val - 1);
    if (btn.dataset.inc) val = val + 1;
    input.value = val;
    opts.updateQty && opts.updateQty(id, val).then(refresh).catch(()=>showLineError(id));
  }

  function handleRemove(btn){
    const id = btn.dataset.del;
    opts.removeLineItem && opts.removeLineItem(id).then(refresh).catch(()=>showLineError(id));
  }

  function showLineError(id){
    const row = itemsEl.querySelector(`.cart-line[data-id="${id}"]`);
    if(row) row.classList.add('cart-line--error');
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
    if(!items.length){
      itemsEl.innerHTML = `<div class="cart-empty">Your cart is empty.</div>`;
      return;
    }
    itemsEl.innerHTML = items.map(it=>{
      const total = (Number(it.price)||0) * (Number(it.qty)||0);
      return `
        <div class="cart-line" data-id="${it.id}">
          <div class="cart-line__img">${it.image ? `<img src="${it.image}" alt="">` : ''}</div>
          <div>
            <p class="cart-line__title">${it.title}</p>
            <p class="cart-line__meta">${it.variantTitle || ''}</p>
            <div class="cart-line__qty">
              <button class="btn btn-outline-secondary btn-reset" data-dec="${it.id}">−</button>
              <input type="number" min="1" value="${it.qty}" data-qty="${it.id}">
              <button class="btn btn-outline-secondary btn-reset" data-inc="${it.id}">+</button>
              <button class="btn btn-link text-danger btn-reset" data-del="${it.id}">Remove</button>
            </div>
          </div>
          <div class="cart-line__total">${formatMoney(total)}</div>
        </div>
      `;
    }).join('');
  }

  function formatMoney(v){
    try{ return window.moneyPKR ? moneyPKR(v) : v; }catch{return v;}
  }

  function update(cart){
    renderItems(cart.items||[]);
    subtotalEl.textContent = formatMoney(cart.subtotal||0);
    if(lastAdded){
      const row = itemsEl.querySelector(`.cart-line[data-id="${lastAdded}"]`);
      if(row){ row.classList.add('cart-line--new'); setTimeout(()=>row.classList.remove('cart-line--new'),300); }
    }
  }

  async function open({ itemId, qty }){
    lastTrigger = document.activeElement;
    lastAdded = itemId;
    undoStack.push({ lineId: itemId, qty });
    isOpen = true;
    panel.hidden = false;
    backdrop.hidden = false;
    requestAnimationFrame(()=>{
      panel.classList.add('open');
      backdrop.classList.add('open');
    });
    const p = opts.getProductById?.(lastAdded);
    announce(p?.title ? `Added ${p.title} to your cart` : 'Added to your cart');
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
    const hide = () => {
      panel.hidden = true; backdrop.hidden = true;
      panel.removeEventListener('transitionend', hide);
    };
    panel.addEventListener('transitionend', hide);
    setTimeout(hide,350);
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
if (typeof window !== 'undefined') {
  window.CartDrawer = CartDrawer;
}
export default CartDrawer;

