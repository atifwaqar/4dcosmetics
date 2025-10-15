/*! Cart Drawer - debug+visibility-fallback */
(function(){
  if (window.__CartDrawerLoaded) return; window.__CartDrawerLoaded = true;

  // ========= Debug =========
  window.__CD_VERSION__ = 'CD-2025-10-15-DBG3';
  const CART_DEBUG = (window.CART_DEBUG !== undefined) ? !!window.CART_DEBUG : true;
  function log(){ if(!CART_DEBUG) return; try{ const a=[...arguments]; a[0]='[CartDrawer] '+a[0]; console.log.apply(console,a);}catch(_){} }
  function warn(){ if(!CART_DEBUG) return; try{ const a=[...arguments]; a[0]='[CartDrawer] '+a[0]; console.warn.apply(console,a);}catch(_){} }
  function err(){ if(!CART_DEBUG) return; try{ const a=[...arguments]; a[0]='[CartDrawer] '+a[0]; console.error.apply(console,a);}catch(_){} }

  const scriptEl = [...document.scripts].find(s=>String(s.src||'').includes('cart-drawer.js')) || null;
  const scriptSrc = scriptEl ? scriptEl.src : '(inline/unknown)';
  log('loaded', { readyState: document.readyState, path: location.pathname, version: window.__CD_VERSION__, scriptSrc });

  // ========= Utilities =========
  const $ = (sel, ctx=document)=>ctx.querySelector(sel);
  const $$ = (sel, ctx=document)=>Array.from(ctx.querySelectorAll(sel));

  // ========= Cart API bridge =========
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

  // ========= CSS helpers =========
  function injectCartCss(){
    log('injectCartCss()');
    const present = [...document.styleSheets].some(s=>s.href && s.href.includes('cart.css'));
    if (present) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    var href = '/assets/css/cart.css';
    if (scriptEl){
      try{
        var url = new URL(scriptSrc, window.location.origin);
        href = url.pathname.replace(/\/js\/cart-drawer\.js$/, '/css/cart.css');
      }catch(_){}
    }
    link.href = href;
    document.head.appendChild(link);
  }

  function injectCssOnce(){
    log('injectCssOnce()');
    if ([...document.styleSheets].some(s=>s.href && s.href.includes('cart-drawer.css'))) return;
    var href = '/assets/css/cart-drawer.css';
    if (scriptEl){
      try{
        var url = new URL(scriptSrc, window.location.origin);
        href = url.pathname.replace(/\/js\/cart-drawer\.js$/, '/css/cart-drawer.css');
      }catch(_){}
    }
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.cartDrawer = '1';
    document.head.appendChild(link);
  }

  function cssDebug(){
    try{
      const sheets = [...document.styleSheets].filter(s=>s.href && (s.href.includes('cart-drawer.css') || s.href.includes('cart.css')));
      log('cssDebug', sheets.map(s=>({ href: s.href, disabled: s.disabled, rules: (()=>{try{return s.cssRules?.length||0}catch(_){return 'blocked'}})() })));
    }catch(e){ warn('cssDebug error', e); }
  }

  function ensureCartUi(onReady){
    if (window.__CartUiLoaded || window.__CART_UI_READY){ onReady && onReady(); return; }
    if (window.CartUIReady){ onReady && onReady(); return; }
    var script = document.createElement('script');
    var base = '/assets/js/cart-ui.js';
    if (scriptEl){
      try{ var url = new URL(scriptSrc, window.location.origin); base = url.pathname.replace(/cart-drawer\.js$/, 'cart-ui.js'); }catch(_){}
    }
    script.src = base;
    script.async = true;
    script.onload = function(){ try{ window.__CART_UI_READY = true; if(typeof simpleCart!=='undefined'){ simpleCart.update(); } }catch(_){ } onReady && onReady(); };
    document.head.appendChild(script);
  }

  // ========= Toast killer =========
  function disableToasts(){
    try{ window.showAddedToast = function(){ try{ CartDrawer.open(); }catch(_){} }; }catch(_){}
    try{
      const cleanup = ()=>document.querySelectorAll('.toast-notice').forEach(n=>n.remove());
      cleanup();
      const mo = new MutationObserver(()=>cleanup());
      mo.observe(document.body, { childList:true, subtree:true });
    }catch(_){}
  }

  // ========= State =========
  const state = {
    api: defaultApi,
    opts: { checkoutUrl:'/cart.html' },
    root: null,
    lastTrigger: null,
    autoCloseTimer: null,
    simpleCartBound: false,
    initialized: false,
    _openDebounce: null
  };

  function bindSimpleCart(){
    log('bindSimpleCart() :: simpleCart present?', typeof simpleCart, 'bind?', simpleCart && typeof simpleCart.bind);
    if (state.simpleCartBound) return;
    if (typeof simpleCart === 'undefined' || typeof simpleCart.bind !== 'function') return;
    try{
      simpleCart.bind('afterAdd', function(){
        log('simpleCart.afterAdd fired');
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
    injectCssOnce();
    disableToasts();
    injectCartCss();
    const root = buildRoot();
    if (!root) return false;
    if (root){
      const checkout = root.querySelector('.cart-drawer-actions a[href]');
      if (checkout){
        const href = state.opts?.checkoutUrl || '/cart.html';
        checkout.setAttribute('href', href);
      }
    }
    try{
      log('env check', {
        simpleCart: typeof simpleCart,
        StorefrontRuntime: typeof window.StorefrontRuntime,
        getProductById: window.StorefrontRuntime && typeof StorefrontRuntime.getProductById,
        getProductBySlug: window.StorefrontRuntime && typeof StorefrontRuntime.getProductBySlug,
        getProductBySku: window.StorefrontRuntime && typeof StorefrontRuntime.getProductBySku
      });
    }catch(_){}
    cssDebug();
    ensureCartUi(function(){ try{ if(typeof simpleCart!=='undefined'){ simpleCart.update(); } }catch(_){ } });
    bindSimpleCart();
    state.initialized = true;
    return true;
  }

  function buildRoot(){
    log('buildRoot()');
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

    // Panel interactions
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

    // Avoid duplicate IDs on /cart
    if (location.pathname.includes('/cart')){
      const sum = root.querySelector('#summary-subtotal'); if(sum){ sum.removeAttribute('id'); }
      const cnt = root.querySelector('#summary-count'); if(cnt){ cnt.removeAttribute('id'); }
    }

    // backdrop close
    root.addEventListener('click', (e)=>{
      const cls = e.target.closest('[data-close]');
      if(cls){ CartDrawer.close(); }
    });

    // qty changes (fix the parseInt typo)
    root.addEventListener('change', (e)=>{
      const qty = e.target.closest('input[type="number"][data-qty]');
      if(qty){
        const id = qty.dataset.qty;
        const v = Math.max(1, parseInt(qty.value||'1',10));
        state.api.updateQty(id, v); render();
      }
    });

    const body = root.querySelector('.cart-drawer-body');
    if(body){ body.addEventListener('scroll', updateScrollIndicators); }

    // swipe-to-close for mobile
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

    // focus trap
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
    try{log('render()');}catch(_){}
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
    if (countEl) { countEl.textContent = `${count} item${count === 1 ? '' : 's'}`; }
    if (typeof simpleCart !== 'undefined'){ try{ simpleCart.update(); }catch(_){ } }
    updateScrollIndicators();
  }

  // ====== Debounced open ======
  function open(trigger){
    if (!ensureReady()) return;
    if (state._openDebounce) clearTimeout(state._openDebounce);
    state._openDebounce = setTimeout(()=>_open(trigger), 10);
  }

  function _open(trigger){
    log('open()', 'trigger=', (trigger && (trigger.tagName+'#'+trigger.id+'.'+trigger.className)) || null);
    state.lastTrigger = trigger || document.activeElement;
    state.root.classList.add('open');
    state.root.removeAttribute('aria-hidden');
    const sb = window.innerWidth - document.documentElement.clientWidth;
    document.body.classList.add('drawer-open');
    if(sb > 0) document.body.style.paddingRight = sb + 'px';
    render();
    const live = $('#cart-drawer-live'); if(live){ live.textContent='Added to your cart'; }

    // ===== Visibility diagnostics + fallback =====
    setTimeout(()=>{
      try{
        const panel = state.root.querySelector('.cart-drawer-panel');
        const backdrop = state.root.querySelector('.cart-drawer-backdrop');
        const rect = panel && panel.getBoundingClientRect();
        const cs = panel ? getComputedStyle(panel) : null;
        log('visibility-check', {
          panelExists: !!panel,
          rect, display: cs && cs.display, visibility: cs && cs.visibility,
          transform: cs && cs.transform, zIndex: cs && cs.zIndex
        });

        // If panel width is 0 or transform suggests it's still off-screen, force show as fallback
        const offscreen = panel && (rect.width === 0 || String(cs.transform||'').includes('matrix') && /-?1(\.0+)?e?\d*/i.test('0') /* no-op */);
        const notShown = panel && (cs.display === 'none' || cs.visibility === 'hidden');
        if (panel && (offscreen || notShown)) {
          warn('panel seems hidden/offscreen → applying fallback inline styles');
          state.root.style.zIndex = '2147483647';
          panel.style.transform = 'translateX(0)';
          panel.style.opacity = '1';
          panel.style.display = 'block';
          backdrop && (backdrop.style.display = 'block');
        }
      }catch(e){ warn('visibility-check error', e); }
    }, 50);

    // Auto close on desktop after ~7s (cancel on interaction)
    clearTimeout(state.autoCloseTimer);
    if (window.matchMedia('(min-width: 769px)').matches){
      state.autoCloseTimer = setTimeout(()=>CartDrawer.close(), 7000);
      state.root.addEventListener('pointerdown', cancelAutoCloseOnce, { once: true });
      state.root.addEventListener('keydown', cancelAutoCloseOnce, { once: true });
    }

    try{
      const badge = document.querySelector('[data-cart-badge], .simpleCart_quantity');
      if (badge){ badge.classList.add('cart-bump'); setTimeout(()=>badge.classList.remove('cart-bump'), 400); }
    }catch(_){}
  }
  function cancelAutoCloseOnce(){ clearTimeout(state.autoCloseTimer); }
  function close(){
    log('close()');
    if (!state.root) return;
    state.root.classList.remove('open');
    state.root.setAttribute('aria-hidden','true');
    document.body.classList.remove('drawer-open');
    document.body.style.paddingRight = '';
    if (state.lastTrigger && typeof state.lastTrigger.focus === 'function') try{ state.lastTrigger.focus(); }catch(_){}
  }

  // ====== PDP resolver for force-adds (keep, but your cart is already updating) ======
  function _resolvePDPData(detail){
    let prod = null;
    try{
      if(window.StorefrontRuntime){
        const id = String(detail && detail.id || '').trim();
        const slug = (location.pathname.split('/').filter(Boolean)[1]) || '';
        if(id && typeof StorefrontRuntime.getProductById==='function') prod = StorefrontRuntime.getProductById(id);
        if(!prod && id && typeof StorefrontRuntime.getProductBySku==='function') prod = StorefrontRuntime.getProductBySku(id);
        if(!prod && id && typeof StorefrontRuntime.getProductBySlug==='function') prod = StorefrontRuntime.getProductBySlug(id);
        if(!prod && slug && typeof StorefrontRuntime.getProductBySlug==='function') prod = StorefrontRuntime.getProductBySlug(slug);
      }
    }catch(_){}
    const name = (prod && (prod.name||prod.title))
      || (document.getElementById('product-title') && document.getElementById('product-title').textContent.trim())
      || (detail && detail.name) || String(detail && detail.id || '');

    let price = null, priceSelector = '(runtime/auto)';
    try{ if(prod){ price = Number(prod.price && (prod.price.current ?? prod.price)); } }catch(_){}
    if(!(price>0)){
      const probes = [
        '#product-price .item_price',
        '.item_price',
        '[itemprop=price][content]',
        '[data-price]',
        '#product-price [data-price]'
      ];
      for(const sel of probes){
        const el = document.querySelector(sel);
        if(!el) continue;
        const raw = (el.getAttribute('content') || el.getAttribute('data-price') || el.textContent || '').replace(/[^0-9.]/g,'');
        const num = Number(raw);
        if(num>0){ price = num; priceSelector = sel; break; }
      }
    }
    let image = '';
    try{
      image = (prod && ((prod.images && prod.images[0])||prod.image))
        || (document.getElementById('main-image') && document.getElementById('main-image').src)
        || '';
    }catch(_){}
    log('PDP resolver', { resolved: !!prod, price, priceSelector, image: !!image });
    return { name, price, image };
  }

  // ========= Global API =========
  window.CartDrawer = {
    init(opts={}){ ensureReady(opts); },
    open(trigger){ open(trigger); },
    close: ()=>close()
  };

  // ========= Critical event listener =========
  log('attaching product:addToCart listener', { version: window.__CD_VERSION__ });
  document.addEventListener('product:addToCart', (e)=>{
    try{
      const d = e && e.detail || {};
      log('event product:addToCart heard in cart-drawer', d, { version: window.__CD_VERSION__ });
      // We still open on every add-to-cart; your cart is already being updated elsewhere.
    }catch(ex){ err('product:addToCart handler error', ex); }
    open(e && e.target);
  });

  // ========= Click fallback (capturing) =========
  document.addEventListener('click', function(ev){
    const btn = ev.target && (ev.target.closest('.item_add') || ev.target.closest('.pc__atc') || ev.target.closest('[data-add-to-cart]') || ev.target.closest('#add-to-cart') || ev.target.closest('.add-to-cart'));
    if(!btn) return;
    log('capturing click fallback for add-to-cart', { tag: btn.tagName, cls: btn.className });
    setTimeout(()=>{ try{ open(btn); }catch(_){ } }, 30);
  }, true);

  // ========= Boot =========
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
