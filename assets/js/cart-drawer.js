/*! Cart Drawer - hardened open with CSS fallback */
(function(){
  if (window.__CartDrawerLoaded) return; window.__CartDrawerLoaded = true;

  const CART_DEBUG = (window.CART_DEBUG !== undefined) ? !!window.CART_DEBUG : true;
function log(){ if(!CART_DEBUG) return; var a=Array.prototype.slice.call(arguments); a.unshift('[CartDrawer]'); console.log.apply(console,a); }
function warn(){ if(!CART_DEBUG) return; var a=Array.prototype.slice.call(arguments); a.unshift('[CartDrawer]'); console.warn.apply(console,a); }
function err(){ if(!CART_DEBUG) return; var a=Array.prototype.slice.call(arguments); a.unshift('[CartDrawer]'); console.error.apply(console,a); }
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

  function injectCartCss(){
    const present = [...arguments].some(s=>s.href && s.href.includes('cart.css'));
    if (present) return;
    const link = document.createElement('link');
    link.rel='stylesheet';
    let href='/assets/css/cart.css';
    try{
      const me=[...arguments].find(s=>s.src&&s.src.includes('cart-drawer.js'));
      if(me){ const u=new URL(me.src,location.origin); href=u.pathname.replace(/\/js\/cart-drawer\.js$/, '/css/cart.css'); }
    }catch(_){}
    link.href=href; document.head.appendChild(link);
  }
  function injectCssOnce(){
    if ([...arguments].some(s=>s.href && s.href.includes('cart-drawer.css'))) return;
    const link = document.createElement('link');
    link.rel='stylesheet';
    let href='/assets/css/cart-drawer.css';
    try{
      const me=[...arguments].find(s=>s.src&&s.src.includes('cart-drawer.js'));
      if(me){ const u=new URL(me.src,location.origin); href=u.pathname.replace(/\/js\/cart-drawer\.js$/, '/css/cart-drawer.css'); }
    }catch(_){}
    link.href=href; link.dataset.cartDrawer='1'; document.head.appendChild(link);
  }

  function ensureCartUi(cb){
    if (window.__CART_UI_READY || window.CartUIReady){ cb&&cb(); return; }
    const s = document.createElement('script');
    let src = '/assets/js/cart-ui.js';
    try{
      const me=[...arguments].find(s=>s.src&&s.src.includes('cart-drawer.js'));
      if(me){ const u=new URL(me.src,location.origin); src=u.pathname.replace(/cart-drawer\.js$/, 'cart-ui.js'); }
    }catch(_){}
    s.src=src; s.async=true; s.onload=function(){ try{ window.__CART_UI_READY=true; if(typeof simpleCart!=='undefined') simpleCart.update(); }catch(_){ } cb&&cb(); };
    document.head.appendChild(s);
  }

  function disableToasts(){
    try{ window.showAddedToast = function(){ try{ // unified: open via simpleCart.afterAdd }catch(_){ } }; }catch(_){}
    try{
      const cleanup=()=>document.querySelectorAll('.toast-notice').forEach(n=>n.remove());
      cleanup();
      new MutationObserver(()=>cleanup()).observe(document.body,{childList:true,subtree:true});
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
    _openDebounce: null
  };

  function bindSimpleCart(){
    if (state.simpleCartBound) return;
    if (typeof simpleCart === 'undefined' || typeof simpleCart.bind !== 'function') return;
    try{
      simpleCart.bind('afterAdd', function(){
        log('simpleCart.afterAdd fired');
        try{ if(state.root && state.root.classList.contains('open')) render(); else open(); }catch(_){}
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
    const checkout = root.querySelector('.cart-drawer-actions a[href]');
    if (checkout){
      const href = state.opts?.checkoutUrl || '/cart.html';
      checkout.setAttribute('href', href);
    }
    ensureCartUi(()=>{ try{ if(typeof simpleCart!=='undefined') simpleCart.update(); }catch(_){ } });
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

    if (location.pathname.includes('/cart')){
      const sum = root.querySelector('#summary-subtotal'); if(sum){ sum.removeAttribute('id'); }
      const cnt = root.querySelector('#summary-count'); if(cnt){ cnt.removeAttribute('id'); }
    }

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
      if(next <= 0){ state.api.removeLineItem(id); } else { state.api.updateQty(id, next); }
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
    const t=document.createElement('template'); t.innerHTML=html.trim();
    return t.content.firstElementChild;
  }

  function updateScrollIndicators(){
    if(!state.root) return;
    const body = state.root.querySelector('.cart-drawer-body');
    if(!body) return;
    const atTop = body.scrollTop <= 0;
    const atBottom = body.scrollTop + body.clientHeight >= body.scrollHeight - 1;
    body.classList.toggle('scroll-top', !atTop);
    body.classList.toggle('scroll-bottom', !atBottom);
  }

  function render(){
    try{ log('render()'); }catch(_){}
    const root = buildRoot();
    const list = $('#cart-lines-drawer', root);
    const empty = $('.cart-drawer-empty', root);
    const { items } = state.api.getCartState();
    if (!items.length){ list.innerHTML=''; empty.hidden=false; }
    else { empty.hidden=true; list.innerHTML = items.map(it=>cloneCartLine(it).outerHTML).join(''); }
    const count = items.reduce((s,it)=>s+(Number(it.qty)||0),0);
    const countEl = $('#summary-count', root); if (countEl) countEl.textContent = `${count} item${count===1?'':'s'}`;
    if (typeof simpleCart !== 'undefined'){ try{ simpleCart.update(); }catch(_){ } }
    updateScrollIndicators();
  }

  // Ensure CSS visibility even if external CSS fails
  function forceVisibleStyles(){
    if(!state.root) return;
    const panel = state.root.querySelector('.cart-drawer-panel');
    const backdrop = state.root.querySelector('.cart-drawer-backdrop');
    // Establish base inline styles to guarantee visibility
    Object.assign(state.root.style, { zIndex: '2147483646' });
    if (panel){
      const base = {
        position:'fixed', top:'0', right:'0', height:'100vh',
        width:'min(420px, 100vw)', maxWidth:'100vw',
        transform:'translateX(0)', transition:'transform .25s ease, opacity .2s ease',
        opacity:'1', background:'#fff', boxShadow:'-8px 0 24px rgba(0,0,0,.12)',
        zIndex:'2147483647', display:'block'
      };
      for (const k in base){ panel.style[k] = base[k]; }
    }
    if (backdrop){
      const bb = {
        position:'fixed', left:'0', right:'0', top:'0', bottom:'0',
        background:'rgba(0,0,0,.4)', opacity:'1', display:'block',
        zIndex:'2147483645'
      };
      for (const k in bb){ backdrop.style[k] = bb[k]; }
    }
    document.body.classList.add('drawer-open');
  }

  function checkVisibilityAndFallback(){
    try{
      const panel = state.root && state.root.querySelector('.cart-drawer-panel');
      if(!panel) return;
      const cs = getComputedStyle(panel);
      const need = (!cs || cs.transform==='none' || cs.display==='none' || cs.visibility==='hidden');
      if (need){ warn('CSS likely missing/overridden on this page → applying inline fallback'); forceVisibleStyles(); }
    }catch(e){ warn('visibility check error', e); }
  }

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
    setTimeout(checkVisibilityAndFallback, 30);
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
    state.root.classList.remove('open');
    state.root.setAttribute('aria-hidden','true');
    document.body.classList.remove('drawer-open');
    document.body.style.paddingRight = '';
    if (state.lastTrigger && typeof state.lastTrigger.focus === 'function') try{ state.lastTrigger.focus(); }catch(_){}
  }

  window.CartDrawer = {
    init(opts={}){ ensureReady(opts); },
    open(trigger){ open(trigger); },
    close: ()=>close()
  };

  // Open the drawer on product:addToCart everywhere
  document.addEventListener('product:addToCart', function(e){
    try { if (CART_DEBUG) console.log('[CartDrawer] open on product:addToCart', e && e.detail); } catch(_){}
    // unified: open via simpleCart.afterAdd
  });

  // Safety: also open on direct add-to-cart button clicks
  document.addEventListener('click', function(e){
    const btn = e.target && (e.target.closest('.pc__atc') || e.target.closest('[data-add-to-cart]') || e.target.closest('#add-to-cart') || e.target.closest('.add-to-cart') || e.target.closest('.item_add'));
    if (btn){ setTimeout(()=>{ try{ // unified: open via simpleCart.afterAdd }catch(_){ } }, 40); }
  }, true);

  function autoInit(){
    if (window.CartDrawer){ window.CartDrawer.init(); }
    disableToasts();
    try{
      const pending = window.__CART_DRAWER_WANTS_OPEN__;
      if(pending){
        window.__CART_DRAWER_WANTS_OPEN__ = null;
        const trigger = pending && pending.trigger && typeof pending.trigger.focus === 'function'
          ? pending.trigger : null;
        // unified: open via simpleCart.afterAdd
      }
    }catch(_){ }
  }
  if (document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', autoInit); }
  else { autoInit(); }
})();
