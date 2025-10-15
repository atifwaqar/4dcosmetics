/*! Cart Drawer - minimal, no cart logic fork. */
(function(){
  if (window.__CartDrawerLoaded) return; window.__CartDrawerLoaded = true;

  // Utilities
  const $ = (sel, ctx=document)=>ctx.querySelector(sel);
  const $$ = (sel, ctx=document)=>Array.from(ctx.querySelectorAll(sel));

  // Cart API bridge (can be overridden via init)
  const defaultApi = {
    getCartState(){
      try{
        if (typeof simpleCart !== 'undefined'){
          const items = simpleCart.items() || [];
          return {
            items: items.map(it=>({
              id: it.id(),
              title: it.get('name'),
              qty: it.quantity(),
              price: Number(it.get('price')||0),
              image: it.get('image') || '',
              variantTitle: it.get('variant') || ''
            }))
          };
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

  
  function ensureCartCss(){
    if (state.cartCssLoaded) return;
    try{
      const present = [...document.styleSheets].some((sheet)=>{
        try{ return sheet.href && sheet.href.includes('cart.css'); }catch(_){ return false; }
      });
      if (present){ state.cartCssLoaded = true; return; }
    }catch(_){ }
    const existing = document.querySelector('link[data-cart-css]');
    if (existing){
      if (existing.dataset.loaded === 'true'){ state.cartCssLoaded = true; return; }
      try{
        if (existing.sheet && existing.sheet.cssRules){ existing.dataset.loaded = 'true'; state.cartCssLoaded = true; return; }
      }catch(_){ }
      if (!state.cartCssPromise){
        state.cartCssPromise = new Promise((resolve)=>{
          const done = ()=>{ state.cartCssLoaded = true; existing.dataset.loaded = 'true'; state.cartCssPromise = null; resolve(); };
          existing.addEventListener('load', done, { once:true });
          existing.addEventListener('error', done, { once:true });
        });
      }
      return;
    }
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.dataset.cartCss = '1';
    // Resolve relative to script src if possible
    var script = [...document.scripts].find(s=>s.src && s.src.includes('cart-drawer.js'));
    var href = '/assets/css/cart.css';
    if (script){
      try{
        var url = new URL(script.src, window.location.origin);
        href = url.pathname.replace(/\/js\/cart-drawer\.js$/, '/css/cart.css');
      }catch(_){}
    }
    link.href = href;
    state.cartCssPromise = new Promise((resolve)=>{
      const done = ()=>{ state.cartCssLoaded = true; link.dataset.loaded = 'true'; state.cartCssPromise = null; resolve(); };
      link.addEventListener('load', done, { once:true });
      link.addEventListener('error', done, { once:true });
    });
    document.head.appendChild(link);
  }
  function ensureCartUi(onReady){
    if (window.__CartUiLoaded || window.__CART_UI_READY){
      onReady && onReady(); return;
    }
    // If the page already loaded cart-ui.js, bail
    if (window.CartUIReady){ onReady && onReady(); return; }
    // Dynamically load assets/js/cart-ui.js so subtotal/formatters run
    var script = document.createElement('script');
    var base = '/assets/js/cart-ui.js';
    var me = [...document.scripts].find(s=>s.src && s.src.includes('cart-drawer.js'));
    if (me){
      try{
        var url = new URL(me.src, window.location.origin);
        base = url.pathname.replace(/cart-drawer\.js$/, 'cart-ui.js');
      }catch(_){}
    }
    script.src = base;
    script.async = true;
    script.onload = function(){ try{ window.__CART_UI_READY = true; if(typeof simpleCart!=='undefined'){ simpleCart.update(); } }catch(_){ } onReady && onReady(); };
    document.head.appendChild(script);
  }

  
  // Kill legacy toast notifications everywhere (replace with drawer UX)
  function disableToasts(){
    try{
      window.showAddedToast = function(){
        try{ CartDrawer.open(); }catch(_){ }
      };
    }catch(_){ }
    try{
      // Remove any existing toast DOM and block future ones
      const cleanup = ()=>document.querySelectorAll('.toast-notice').forEach(n=>n.remove());
      cleanup();
      const mo = new MutationObserver(()=>cleanup());
      mo.observe(document.body, { childList:true, subtree:true });
    }catch(_){}
  }

  const state = {
    api: defaultApi,
    opts: { checkoutUrl:'/cart.html' },
    root: null,
    lastTrigger: null,
    autoCloseTimer: null,
    simpleCartBound: false,
    initialized: false,
    cartCssLoaded: false,
    cartCssPromise: null,
    drawerCssLoaded: false,
    drawerCssPromise: null,
    waitingForCss: false,
    pendingTrigger: null
  };

  function injectCssOnce(){
    // Try to resolve CSS path from the script src
    if ([...document.styleSheets].some(s=>s.href && s.href.includes('cart-drawer.css'))){
      state.drawerCssLoaded = true;
      return;
    }
    if (state.drawerCssPromise) return;
    var script = [...document.scripts].find(s=>s.src && s.src.includes('cart-drawer.js'));
    var href = '/assets/css/cart-drawer.css';
    if (script){
      try{
        var url = new URL(script.src, window.location.origin);
        // replace /js/cart-drawer.js -> /css/cart-drawer.css
        href = url.pathname.replace(/\/js\/cart-drawer\.js$/, '/css/cart-drawer.css');
      }catch(_){}
    }
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.cartDrawer = '1';
    state.drawerCssPromise = new Promise((resolve)=>{
      link.addEventListener('load', ()=>{ state.drawerCssLoaded = true; resolve(); }, { once:true });
      link.addEventListener('error', ()=>{ state.drawerCssLoaded = true; resolve(); }, { once:true });
    });
    document.head.appendChild(link);
  }

  function bindSimpleCart(){
    if (state.simpleCartBound) return;
    if (typeof simpleCart === 'undefined' || typeof simpleCart.bind !== 'function') return;
    try{
      simpleCart.bind('afterAdd', function(){
        try{
          if(state.root && state.root.classList.contains('open')){
            render();
          }else{
            open();
          }
        }catch(_){}
      });
      state.simpleCartBound = true;
    }catch(_){}
  }

  function ensureReady(opts){
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
    injectCssOnce();
    disableToasts();
    ensureCartCss();
    const root = buildRoot();
    if (!root) return false;
    if (root){
      const checkout = root.querySelector('.cart-drawer-actions a[href]');
      if (checkout){
        const href = state.opts?.checkoutUrl || '/cart.html';
        checkout.setAttribute('href', href);
      }
    }
    ensureCartUi(function(){ try{ if(typeof simpleCart!=='undefined'){ simpleCart.update(); } }catch(_){ } });
    bindSimpleCart();
    state.initialized = true;
    return true;
  }

  function buildRoot(){
    if (state.root) return state.root;
    const root = document.createElement('div');
    root.className = 'cart-drawer-root';
    root.setAttribute('aria-hidden','true');
    root.innerHTML = `
      <div class="cart-drawer-backdrop" data-close tabindex="-1"></div>
      <div class="cart-drawer-panel" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title">
        <header class="cart-drawer-header">
          <h2 id="cart-drawer-title" class="cart-drawer-title">Your cart</h2>
          <button type="button" class="btn btn-link" data-close aria-label="Close cart">✕</button>
        </header>
        <div class="cart-drawer-body">
          <div id="cart-lines-drawer"></div>
          <div class="cart-drawer-empty" hidden>Your cart is empty.</div>
        </div>
        <footer class="cart-drawer-footer p-4 border-t bg-gray-50 space-y-3">
          <div class="flex justify-between">
            <span class="text-gray-900 text-sm md:text-base font-medium">Subtotal · <span id="summary-count" class="text-gray-500 font-normal">0 items</span></span>
            <span id="summary-subtotal" class="text-gray-900 font-semibold text-2xl md:text-3xl whitespace-nowrap">—</span>
          </div>
          <div class="cart-drawer-actions">
            <a class="btn btn-primary flex items-center justify-center w-full rounded-xl h-12 text-base font-semibold bg-[#1E88E5] text-white hover:brightness-95" href="${state.opts.checkoutUrl}">Checkout</a>
          </div>
        </footer>
      </div>
      <div class="visually-hidden" aria-live="polite" id="cart-drawer-live"></div>
    `;
    document.body.appendChild(root);
    state.root = root;

    // Panel interactions (qty +/-/remove and footer links)
    const _panel = root.querySelector('.cart-drawer-panel');
    if (_panel){
      _panel.addEventListener('click', (e)=>{
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
    }

    // Do not create duplicate summary ids on /cart page; hide footer subtotals there
    if (location.pathname.includes('/cart')){
      const sum = root.querySelector('#summary-subtotal'); if(sum){ sum.removeAttribute('id'); }
      const cnt = root.querySelector('#summary-count'); if(cnt){ cnt.removeAttribute('id'); }
    }

    // Close when clicking backdrop
    root.addEventListener('click', (e)=>{
      const cls = e.target.closest('[data-close]');
      if(cls){ CartDrawer.close(); }
    });

    root.addEventListener('change', (e)=>{
      const qty = e.target.closest('input[type="number"][data-qty]');
      if(qty){ const id = qty.dataset.qty; const v = Math.max(1, parseInt(qty.value||'1',10)); state.api.updateQty(id, v); render(); }
    });

    const body = root.querySelector('.cart-drawer-body');
    if(body){ body.addEventListener('scroll', updateScrollIndicators); }

    // Close drawer on downward swipe for mobile screens
    const panel = root.querySelector('.cart-drawer-panel');
    if(panel){
      let startY = null;
      panel.addEventListener('touchstart', function(e){
        if(!window.matchMedia('(max-width: 768px)').matches) return;
        startY = e.touches[0].clientY;
      }, {passive:true});
      panel.addEventListener('touchmove', function(e){
        if(startY===null) return;
        const currentY = e.touches[0].clientY;
        const diff = currentY - startY;
        if(diff > 50 && (!body || body.scrollTop <= 0)){
          startY = null;
          close();
        }
      }, {passive:true});
      panel.addEventListener('touchend', function(){ startY = null; }, {passive:true});
      panel.addEventListener('touchcancel', function(){ startY = null; }, {passive:true});
    }

    // Basic focus trap
    root.addEventListener('keydown', (e)=>{
      if(e.key === 'Escape') { e.preventDefault(); CartDrawer.close(); }
      if(e.key === 'Tab' && root.classList.contains('open')){
        const focusables = $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', root.querySelector('.cart-drawer-panel'))
          .filter(el=>!el.hasAttribute('disabled') && el.offsetParent !== null);
        if (!focusables.length) return;
        const first = focusables[0], last = focusables[focusables.length-1];
        if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
      }
    });
    return root;
  }

  function changeQty(id, delta){
    try{
      const items = state.api.getCartState().items;
      const found = items.find(i=>String(i.id)===String(id));
      const next = (found?.qty||1) + delta;
      if(next <= 0){
        state.api.removeLineItem(id);
      }else{
        state.api.updateQty(id, next);
      }
      render();
    }catch(_){}
  }

  function cloneCartLine(it){
    // IMPORTANT: Keep structure identical to cart-ui.js
    const total = (Number(it.price)||0) * (Number(it.qty)||0);
    const html = `
      <div class="cart-line">
        <div class="cart-line__img">${it.image ? `<img src="${it.image}" alt="">` : ''}</div>
        <div class="cart-line__info">
          <p class="cart-line__title">${it.title||''}</p>
          <p class="cart-line__meta">${it.variantTitle||''}</p>
          <div class="cart-line__qty">
            <button class="btn btn-outline-secondary" data-dec="${it.id}">−</button>
            <input type="number" min="1" value="${it.qty}" data-qty="${it.id}">
            <button class="btn btn-outline-secondary" data-inc="${it.id}">+</button>
            <button class="btn btn-link text-danger" data-del="${it.id}">Remove</button>
          </div>
        </div>
        <div class="cart-line__total">${typeof moneyPKR==='function' ? moneyPKR(total) : total}</div>
      </div>`;
    const t = document.createElement('template'); t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function updateScrollIndicators(){
    if(!state.root) return;
    var body = state.root.querySelector('.cart-drawer-body');
    if(!body) return;
    var atTop = body.scrollTop <= 0;
    var atBottom = body.scrollTop + body.clientHeight >= body.scrollHeight - 1;
    body.classList.toggle('scroll-top', !atTop);
    body.classList.toggle('scroll-bottom', !atBottom);
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
    if (countEl) {
      countEl.textContent = `${count} item${count === 1 ? '' : 's'}`;
    }
    // Let existing cart-ui.js update summary numbers if present
    if (typeof simpleCart !== 'undefined'){ try{ simpleCart.update(); }catch(_){ } }
    updateScrollIndicators();
  }

  function waitForStyles(trigger){
    ensureCartCss();
    const pending = [];
    if (state.cartCssPromise && !state.cartCssLoaded) pending.push(state.cartCssPromise);
    if (state.drawerCssPromise && !state.drawerCssLoaded) pending.push(state.drawerCssPromise);
    if (!pending.length) return false;
    state.pendingTrigger = trigger || state.pendingTrigger || null;
    if (state.waitingForCss) return true;
    state.waitingForCss = true;
    Promise.all(pending).then(()=>{
      state.waitingForCss = false;
      const next = state.pendingTrigger;
      state.pendingTrigger = null;
      if (next !== false){
        open(next);
      }
    });
    return true;
  }

  function open(trigger){
    if (!ensureReady()) return;
    if (waitForStyles(trigger)) return;
    state.waitingForCss = false;
    state.pendingTrigger = null;
    state.lastTrigger = trigger || document.activeElement;
    state.root.classList.add('open');
    state.root.removeAttribute('aria-hidden');
    const sb = window.innerWidth - document.documentElement.clientWidth;
    document.body.classList.add('drawer-open');
    if(sb > 0) document.body.style.paddingRight = sb + 'px';
    render();
    const live = $('#cart-drawer-live'); if(live){ live.textContent='Added to your cart'; }
    // Focus first interactive element
    const first = state.root.querySelector('.cart-drawer-panel .btn, .cart-drawer-panel input, .cart-drawer-panel [href]');
    if(first) first.focus();
    // Auto close on desktop after ~7s (cancel on interaction)
    clearTimeout(state.autoCloseTimer);
    if (window.matchMedia('(min-width: 769px)').matches){
      state.autoCloseTimer = setTimeout(()=>CartDrawer.close(), 7000);
      state.root.addEventListener('pointerdown', cancelAutoCloseOnce, { once: true });
      state.root.addEventListener('keydown', cancelAutoCloseOnce, { once: true });
    }
    // Optional: bump cart badge
    try{
      const badge = document.querySelector('[data-cart-badge], .simpleCart_quantity');
      if (badge){ badge.classList.add('cart-bump'); setTimeout(()=>badge.classList.remove('cart-bump'), 400); }
    }catch(_){}
  }
  function cancelAutoCloseOnce(){ clearTimeout(state.autoCloseTimer); }
  function close(){
    if (!state.root) return;
    state.root.classList.remove('open');
    state.root.setAttribute('aria-hidden','true');
    document.body.classList.remove('drawer-open');
    document.body.style.paddingRight = '';
    if (state.lastTrigger && typeof state.lastTrigger.focus === 'function') try{ state.lastTrigger.focus(); }catch(_){}
  }

  // Global
  window.CartDrawer = {
    init(opts={}){
      ensureReady(opts);
    },
    open(trigger){
      open(trigger);
    },
    close: ()=>close()
  };

  // Always react to add-to-cart events, even if init hasn't run yet
  document.addEventListener('product:addToCart', (e)=>open(e && e.target));

  function autoInit(){
    if (window.CartDrawer){ window.CartDrawer.init(); }
    disableToasts();
    try{
      const pending = window.__CART_DRAWER_WANTS_OPEN__;
      if(pending){
        window.__CART_DRAWER_WANTS_OPEN__ = null;
        const trigger = pending && pending.trigger && typeof pending.trigger.focus === 'function'
          ? pending.trigger
          : null;
        CartDrawer.open(trigger);
      }
    }catch(_){ }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', autoInit);
  }else{
    autoInit();
  }
})();