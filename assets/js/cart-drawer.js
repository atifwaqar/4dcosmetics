/*! Cart Drawer — inline-styled, CSS-independent */
(function(){
  if (window.__CartDrawerLoaded) return; window.__CartDrawerLoaded = true;

  const CART_DEBUG = (window.CART_DEBUG !== undefined) ? !!window.CART_DEBUG : true;
  const log = (...a)=>{ if(!CART_DEBUG) return; try{ a[0]='[CartDrawer] '+a[0]; console.log.apply(console,a);}catch{} };

  const $ = (s,c=document)=>c.querySelector(s);
  const $$ = (s,c=document)=>Array.from(c.querySelectorAll(s));

  const defaultApi = {
    getCartState(){
      try{
        if (typeof simpleCart !== 'undefined'){
          const items = simpleCart.items() || [];
          return { items: items.map(it=>({
            id: it.id(),
            title: it.get('name'),
            qty: it.quantity(),
            price: Number(it.get('price')||0),
            image: it.get('image') || '',
            variantTitle: it.get('variant') || ''
          }))};
        }
      }catch(_){}
      return { items: [] };
    },
    updateQty(id, qty){
      try{ if(typeof simpleCart!=='undefined'){ simpleCart.find(id).set('quantity', qty); simpleCart.update(); } }catch(_){}
    },
    removeLineItem(id){
      try{ if(typeof simpleCart!=='undefined'){ simpleCart.find(id).remove(); simpleCart.update(); } }catch(_){}
    }
  };

  const state = {
    api: defaultApi,
    opts: { checkoutUrl:'/cart.html' },
    root: null,
    lastTrigger: null,
    autoCloseTimer: null,
    simpleCartBound: false,
    _openDebounce: null
  };

  function disableToasts(){
    try{ window.showAddedToast = function(){ try{ CartDrawer.open(); }catch(_){ } }; }catch(_){}
  }

  function ensureReady(opts){
    log('ensureReady() called with opts=', !!opts);
    if (opts && typeof opts === 'object'){
      state.opts = Object.assign(state.opts, opts);
      if (opts.getCartState || opts.updateQty || opts.removeLineItem){
        state.api = Object.assign({}, defaultApi, {
          getCartState: opts.getCartState || defaultApi.getCartState,
          updateQty: opts.updateQty || defaultApi.updateQty,
          removeLineItem: opts.removeLineItem || defaultApi.removeLineItem
        });
      }
    }
    disableToasts();
    buildRoot();
    bindSimpleCart();
    return true;
  }

  function applyInlineBaseStyles(){
    // Root
    Object.assign(state.root.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2147483646',
      pointerEvents: 'none' // enabled when open
    });
    // Panel
    const panel = state.root.querySelector('.cart-drawer-panel');
    Object.assign(panel.style, {
      position: 'fixed',
      top: '0',
      right: '0',
      height: '100vh',
      width: 'min(420px, 100vw)',
      maxWidth: '100vw',
      background: '#fff',
      boxShadow: '-8px 0 24px rgba(0,0,0,.12)',
      transform: 'translateX(100%)',
      transition: 'transform .25s ease, opacity .2s ease',
      opacity: '0',
      zIndex: '2147483647',
      display: 'block'
    });
    // Backdrop
    const backdrop = state.root.querySelector('.cart-drawer-backdrop');
    Object.assign(backdrop.style, {
      position: 'fixed',
      left: '0', right: '0', top: '0', bottom: '0',
      background: 'rgba(0,0,0,.4)',
      opacity: '0',
      transition: 'opacity .2s ease',
      zIndex: '2147483645',
      display: 'block',
      pointerEvents: 'none'
    });
  }
  function applyInlineOpenStyles(){
    state.root.style.pointerEvents = 'auto';
    const panel = state.root.querySelector('.cart-drawer-panel');
    const backdrop = state.root.querySelector('.cart-drawer-backdrop');
    panel.style.transform = 'translateX(0)';
    panel.style.opacity = '1';
    backdrop.style.opacity = '1';
    backdrop.style.pointerEvents = 'auto';
  }
  function applyInlineClosedStyles(){
    state.root.style.pointerEvents = 'none';
    const panel = state.root.querySelector('.cart-drawer-panel');
    const backdrop = state.root.querySelector('.cart-drawer-backdrop');
    panel.style.transform = 'translateX(100%)';
    panel.style.opacity = '0';
    backdrop.style.opacity = '0';
    backdrop.style.pointerEvents = 'none';
  }

  function buildRoot(){
    if (state.root) return state.root;
    const root = document.createElement('div');
    root.className = 'cart-drawer-root';
    root.setAttribute('aria-hidden','true');
    root.innerHTML = `
      <div class="cart-drawer-backdrop" data-close tabindex="-1"></div>
      <div class="cart-drawer-panel" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title">
        <header class="cart-drawer-header" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #eee;">
          <h2 id="cart-drawer-title" class="cart-drawer-title" style="margin:0;font-size:16px;font-weight:600;">Your cart</h2>
          <button type="button" class="btn btn-link" data-close aria-label="Close cart" style="font-size:18px;line-height:1.2;cursor:pointer;background:none;border:0;">✕</button>
        </header>
        <div class="cart-drawer-body" style="overflow:auto;max-height:calc(100vh - 160px);padding:16px;">
          <div id="cart-lines-drawer"></div>
          <div class="cart-drawer-empty" hidden>Your cart is empty.</div>
        </div>
        <footer class="cart-drawer-footer" style="padding:16px;border-top:1px solid #eee;background:#fafafa;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <span style="color:#111;font-size:14px;font-weight:500;">Subtotal · <span id="summary-count" style="color:#666;font-weight:400;">0 items</span></span>
            <span id="summary-subtotal" style="color:#111;font-weight:700;font-size:20px;white-space:nowrap">—</span>
          </div>
          <div class="cart-drawer-actions">
            <a class="btn btn-primary" href="${state.opts.checkoutUrl}" style="display:block;width:100%;height:48px;border-radius:12px;background:#1E88E5;color:#fff;font-weight:600;text-align:center;line-height:48px;text-decoration:none;">Checkout</a>
          </div>
        </footer>
      </div>
      <div class="visually-hidden" aria-live="polite" id="cart-drawer-live"></div>
    `;
    document.body.appendChild(root);
    state.root = root;
    applyInlineBaseStyles();

    // Interactions
    const panel = root.querySelector('.cart-drawer-panel');
    panel.addEventListener('click', (e)=>{
      const go = e.target.closest('.cart-drawer-footer a[href]');
      if (go){
        e.preventDefault(); e.stopPropagation();
        const href = go.getAttribute('href') || '/cart.html';
        try{ window.location.assign(href); }catch(_){ window.location.href = href; }
        return;
      }
      const dec = e.target.closest('[data-dec]');
      if(dec){ e.preventDefault(); e.stopPropagation(); changeQty(dec.dataset.dec, -1); return; }
      const inc = e.target.closest('[data-inc]');
      if(inc){ e.preventDefault(); e.stopPropagation(); changeQty(inc.dataset.inc, +1); return; }
      const del = e.target.closest('[data-del]');
      if(del){ e.preventDefault(); e.stopPropagation(); state.api.removeLineItem(del.dataset.del); render(); return; }
      const cls = e.target.closest('[data-close]');
      if(cls){ e.preventDefault(); e.stopPropagation(); CartDrawer.close(); return; }
      e.stopPropagation();
    });

    root.addEventListener('click', (e)=>{
      const cls = e.target.closest('[data-close]');
      if(cls){ CartDrawer.close(); }
    });

    // qty input
    root.addEventListener('change', (e)=>{
      const qty = e.target.closest('input[type="number"][data-qty]');
      if(qty){ const id = qty.dataset.qty; const v = Math.max(1, parseInt(qty.value||'1',10)); state.api.updateQty(id, v); render(); }
    });

    // esc & basic focus trap
    root.addEventListener('keydown', (e)=>{
      if(e.key === 'Escape') { e.preventDefault(); CartDrawer.close(); }
      if(e.key === 'Tab' && root.getAttribute('aria-hidden') === 'false'){
        const focusables = $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', panel)
          .filter(el=>!el.hasAttribute('disabled') && el.offsetParent !== null);
        if (!focusables.length) return;
        const first = focusables[0], last = focusables[focusables.length-1];
        if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
      }
    });

    return root;
  }

  function bindSimpleCart(){
    if (state.simpleCartBound) return;
    if (typeof simpleCart === 'undefined' || typeof simpleCart.bind !== 'function') return;
    try{
      simpleCart.bind('afterAdd', function(){ log('simpleCart.afterAdd fired');
        try{ if(state.root && state.root.getAttribute('aria-hidden')==='false'){ render(); } else { open(); } }catch(_){}
      });
      state.simpleCartBound = true;
    }catch(_){}
  }

  function changeQty(id, delta){
    try{
      const items = state.api.getCartState().items;
      const found = items.find(i=>String(i.id)===String(id));
      const next = (found?.qty||1) + delta;
      if(next <= 0){ state.api.removeLineItem(id); } else { state.api.updateQty(id, next); }
      render();
    }catch(_){}
  }

  function cloneCartLine(it){
    const total = (Number(it.price)||0) * (Number(it.qty)||0);
    const html = `
      <div class="cart-line" style="display:flex;gap:12px;align-items:flex-start;margin-bottom:12px;">
        <div class="cart-line__img" style="width:72px;height:72px;flex:0 0 72px;border:1px solid #eee;border-radius:8px;overflow:hidden;">${it.image ? `<img src="${it.image}" alt="" style="width:100%;height:100%;object-fit:cover;">` : ''}</div>
        <div class="cart-line__info" style="flex:1 1 auto;">
          <p class="cart-line__title" style="margin:0 0 4px;font-weight:600;">${it.title||''}</p>
          <p class="cart-line__meta" style="margin:0 0 8px;color:#666;font-size:12px;">${it.variantTitle||''}</p>
          <div class="cart-line__qty" style="display:flex;align-items:center;gap:8px;">
            <button class="btn btn-outline-secondary" data-dec="${it.id}" style="min-width:32px;height:32px;border:1px solid #ddd;border-radius:6px;background:#fff;">−</button>
            <input type="number" min="1" value="${it.qty}" data-qty="${it.id}" style="width:52px;height:32px;border:1px solid #ddd;border-radius:6px;text-align:center;">
            <button class="btn btn-outline-secondary" data-inc="${it.id}" style="min-width:32px;height:32px;border:1px solid #ddd;border-radius:6px;background:#fff;">+</button>
            <button class="btn btn-link text-danger" data-del="${it.id}" style="margin-left:auto;color:#c00;background:none;border:0;cursor:pointer;">Remove</button>
          </div>
        </div>
        <div class="cart-line__total" style="min-width:64px;text-align:right;font-weight:600;">${typeof moneyPKR==='function' ? moneyPKR(total) : total}</div>
      </div>`;
    const t = document.createElement('template'); t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function render(){
    const root = buildRoot();
    const list = $('#cart-lines-drawer', root);
    const empty = $('.cart-drawer-empty', root);
    const { items } = state.api.getCartState();
    if (!items.length){
      list.innerHTML = '';
      empty.hidden = false;
    }else{
      empty.hidden = true;
      list.innerHTML = items.map(it=>cloneCartLine(it).outerHTML).join('');
    }
    const count = items.reduce((s, it) => s + (Number(it.qty) || 0), 0);
    const countEl = $('#summary-count', root);
    if (countEl) countEl.textContent = `${count} item${count === 1 ? '' : 's'}`;
    try{ if(typeof simpleCart!=='undefined') simpleCart.update(); }catch(_){}
  }

  function open(trigger){
    if (!ensureReady()) return;
    if (state._openDebounce) clearTimeout(state._openDebounce);
    state._openDebounce = setTimeout(()=>_open(trigger), 5);
  }
  function _open(trigger){
    log('open()', 'trigger=', (trigger && (trigger.tagName+'#'+trigger.id+'.'+trigger.className)) || null);
    state.lastTrigger = trigger || document.activeElement;
    state.root.setAttribute('aria-hidden','false');
    document.body.classList.add('drawer-open');
    render();
    applyInlineOpenStyles();
    const live = $('#cart-drawer-live'); if(live) live.textContent='Added to your cart';
    // focus something
    const first = state.root.querySelector('.cart-drawer-panel .btn, .cart-drawer-panel input, .cart-drawer-panel [href]');
    if(first) first.focus({preventScroll:true});
    // auto-close on desktop
    clearTimeout(state.autoCloseTimer);
    if (window.matchMedia('(min-width: 769px)').matches){
      state.autoCloseTimer = setTimeout(()=>CartDrawer.close(), 7000);
      state.root.addEventListener('pointerdown', ()=>clearTimeout(state.autoCloseTimer), { once: true });
      state.root.addEventListener('keydown', ()=>clearTimeout(state.autoCloseTimer), { once: true });
    }
    try{
      const badge = document.querySelector('[data-cart-badge], .simpleCart_quantity');
      if (badge){ badge.classList.add('cart-bump'); setTimeout(()=>badge.classList.remove('cart-bump'), 400); }
    }catch(_){}
  }

  function close(){
    log('close()');
    if (!state.root) return;
    state.root.setAttribute('aria-hidden','true');
    document.body.classList.remove('drawer-open');
    applyInlineClosedStyles();
    if (state.lastTrigger && typeof state.lastTrigger.focus === 'function'){
      try{ state.lastTrigger.focus(); }catch(_){}
    }
  }

  window.CartDrawer = { init: ensureReady, open, close };

  // Open on add-to-cart everywhere
  document.addEventListener('product:addToCart', function(e){
    try{ if(CART_DEBUG) console.log('[CartDrawer] open on product:addToCart', e && e.detail); }catch(_){}
    CartDrawer.open(e && e.target);
  }, true);

  // As a safety, also open on direct add-to-cart button clicks
  document.addEventListener('click', function(e){
    const btn = e.target && (e.target.closest('.pc__atc') || e.target.closest('[data-add-to-cart]') || e.target.closest('#add-to-cart') || e.target.closest('.add-to-cart') || e.target.closest('.item_add'));
    if (btn){ setTimeout(()=>{ try{ CartDrawer.open(btn); }catch(_){ } }, 30); }
  }, true);

  // Boot
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', ()=>{ ensureReady(); });
  }else{
    ensureReady();
  }
})();
