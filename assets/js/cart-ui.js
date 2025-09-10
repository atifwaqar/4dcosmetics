
(function(){
  // Config (override by defining these on window before this script loads)
  const TAX_RATE = typeof window.CART_TAX_RATE === 'number' ? window.CART_TAX_RATE : 0.10;            // 10%
  const FREE_SHIP_THRESHOLD = typeof window.CART_FREE_SHIPPING_THRESHOLD === 'number' ? window.CART_FREE_SHIPPING_THRESHOLD : 50000;
  const COUPONS = window.CART_COUPONS || {
    WELCOME10: { type: 'percent', value: 10, min: 0 },
    OFF500:    { type: 'amount',  value: 500, min: 2000 }
  };

  function fmt(n){
    return moneyPKR(n);
  }

  function ensureSummaryBlocks(){
    const aside = document.querySelector('.cart-summary');
    if (!aside) return null;

    // Only build once
    if (aside.dataset.enhanced === '1') return aside;
    aside.dataset.enhanced = '1';

    // Mark aside as having checkout forms (so CSS can disable sticky)
    aside.classList.add('has-forms');

    // Clear & rebuild a consistent summary layout
    const defaultPM = localStorage.getItem('checkout_pm') || 'whatsappCod';
    aside.innerHTML = `
      <div class="summary-card card"><div class="row"><span>Subtotal</span><span id="summary-subtotal">—</span></div>

      <div class="coupon-block" id="coupon-block">
        <label for="coupon-input">Coupon Code</label>
        <div class="coupon-row">
          <input id="coupon-input" type="text" placeholder="Enter code" />
          <button id="apply-coupon" class="btn btn-outline">Apply</button>
        </div>
        <div id="coupon-msg" class="coupon-msg"></div>
        <div id="discount-line" class="row hidden">
          <span>Discount</span>
          <span id="summary-discount">—</span>
        </div>
      </div>

      <div class="row"><span>Sales Tax (${Math.round(TAX_RATE*100)}%)</span><span id="summary-tax">—</span></div>

      <div class="row total">
        <span>Grand Total</span>
        <span id="summary-grand">—</span>
      </div>

      <div class="free-ship">
        <div id="fs-msg" class="fs-msg">Spend more to get Free Shipping</div>
        <div class="progress"><div id="fs-bar" class="progress-bar" style="width:0%"></div></div>
      </div></div>

<section id="buyer-details" aria-labelledby="bd-title" class="pm-section card">
        <h2 id="bd-title">Buyer details</h2>
        <label for="buyer-name">Full Name</label>
        <input id="buyer-name" type="text" required placeholder="Your name">
        <label for="buyer-phone">Phone</label>
        <input id="buyer-phone" type="tel" required placeholder="03001234567">
        <label for="buyer-address">Address</label>
        <textarea id="buyer-address" required placeholder="Street and house no."></textarea>
        <label for="buyer-city">City</label>
        <input id="buyer-city" type="text" required placeholder="City">
        <label for="checkout-notes">Notes (optional)</label>
        <textarea id="checkout-notes" placeholder="Any delivery instructions"></textarea>
      </section>

      <section id="payment-methods" aria-labelledby="pm-title" class="pm-section card">
        <h2 id="pm-title">Payment method</h2>
        <div class="pm-options" role="radiogroup" aria-label="Payment methods">
          <label class="pm-option"><input type="radio" name="payment-method" value="whatsappCod" ${defaultPM === 'whatsappCod' ? 'checked' : ''}> WhatsApp (Cash on Delivery)</label>
          <label class="pm-option"><input type="radio" name="payment-method" value="cod" ${defaultPM === 'cod' ? 'checked' : ''}> Cash on Delivery (Email)</label>
          <small class="pm-note">All transactions are charged in PKR.</small>
        </div>
        <div id="pm-feedback" class="pm-feedback" role="status" aria-live="polite"></div>
      </section>

      <button id="checkout-btn" class="btn btn-primary btn-lg w-100">Place Order (Cash on Delivery)</button>
      <div id="checkout-feedback" class="checkout-notes" aria-live="polite"></div>
    `;

    return aside;
  }

  function getItems(){
    try{
      if (typeof simpleCart !== 'undefined') return simpleCart.items() || [];
    }catch(_){}
    return [];
  }

  function readCoupon(){
    const field = document.getElementById('coupon-input');
    const raw = (field?.value || localStorage.getItem('cart_coupon') || '').trim().toUpperCase();
    if (!raw) return null;
    const def = COUPONS[raw];
    if (!def) return { code: raw, invalid: true };
    return { code: raw, ...def };
  }

  function calcTotals(){
    const items = getItems();
    const subtotal = items.reduce((s,it)=> s + (Number(it.get('price')||0) * it.quantity()), 0);

    // coupon
    const cp = readCoupon();
    let discount = 0, couponMsg = '';
    if (cp && !cp.invalid){
      if (subtotal >= (cp.min || 0)){
        discount = cp.type === 'percent' ? (subtotal * (cp.value/100)) : Math.min(subtotal, cp.value||0);
        couponMsg = `Coupon ${cp.code} applied.`;
      }else{
        couponMsg = `Add ${fmt((cp.min||0) - subtotal)} more to use ${cp.code}.`;
      }
    }else if (cp && cp.invalid){
      couponMsg = `Coupon ${cp.code} is not valid.`;
    }

    const taxable = Math.max(0, subtotal - discount);
    const tax = taxable * TAX_RATE;
    const grand = taxable + tax;

    // Free shipping progress
    const rem = Math.max(0, FREE_SHIP_THRESHOLD - taxable);
    const pct = Math.max(0, Math.min(100, (taxable / FREE_SHIP_THRESHOLD) * 100));

    return { subtotal, discount, tax, grand, couponMsg, coupon: cp, fsRemaining: rem, fsPercent: pct };
  }

  function render(){
    const aside = ensureSummaryBlocks();
    const listEl = document.getElementById('cart-lines');
    const totals = calcTotals();
    const items = getItems();

    // Render lines (if there is a list container present)
    if (listEl){
      if(!items.length){
        listEl.innerHTML = `<div class="cart-empty">Your cart is empty. <a href="/c/">Browse products</a></div>`;
      }else{
        listEl.innerHTML = items.map(it=>{
          const img = it.get('image') || '';
          const title = it.get('name');
          const qty = it.quantity();
          const price = Number(it.get('price')||0);
          const total = qty * price;
          return `
            <div class="cart-line flex items-center gap-4 p-3 rounded-2xl shadow-sm bg-white">
              <div class="cart-line__img">${img? `<img src="${img}" alt="">` : ''}</div>

              <div class="cart-line__info flex-1 min-w-0">
                <div class="flex justify-between items-start gap-2">
                  <p class="text-gray-900 font-semibold text-sm md:text-base leading-snug line-clamp-2 flex-1">${title}</p>
                  <p class="text-[#1E88E5] font-semibold text-xl md:text-2xl whitespace-nowrap">${fmt(total)}</p>
                </div>

                <p class="cart-line__meta">${it.get('variant')||''}</p>

                <div class="cart-line__qty flex items-center gap-3 mt-3">
                  <button type="button" class="h-9 w-9 rounded-full border border-gray-200 bg-white text-gray-700 inline-flex items-center justify-center hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200" data-dec="${it.id()}" aria-label="Decrease quantity">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="pointer-events-none"><path d="M5 12h14"/></svg>
                  </button>

                  <span class="text-gray-900 text-base font-medium inline-block text-center min-w-[1.5ch]" data-qty="${it.id()}">${qty}</span>

                  <button type="button" class="h-9 w-9 rounded-full border border-gray-200 bg-white text-gray-700 inline-flex items-center justify-center hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200" data-inc="${it.id()}" aria-label="Increase quantity">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="pointer-events-none"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
                  </button>

                  <button type="button" class="ml-auto h-9 w-9 rounded-full inline-flex items-center justify-center text-red-500 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200" data-del="${it.id()}" aria-label="Remove item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="pointer-events-none"><path d="M3 6h18"/><path d="M8 6v-2c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v2"/><path d="M19 6l-1 14c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                  </button>
                </div>
              </div>
            </div>`;
        }).join('');
      }
    }

    // Summary numbers
    const el = (id)=>document.getElementById(id);
    const countEl = el('summary-count');
    if (countEl){
      const count = items.reduce((s, it) => s + it.quantity(), 0);
      countEl.textContent = `${count} item${count === 1 ? '' : 's'}`;
    }
    el('summary-subtotal') && (el('summary-subtotal').textContent = fmt(totals.subtotal));

    if (totals.discount > 0){
      const dl = el('discount-line');
      if (dl) dl.classList.remove('hidden');
      el('summary-discount') && (el('summary-discount').textContent = '− ' + fmt(totals.discount));
    }else{
      const dl = el('discount-line');
      if (dl) dl.classList.add('hidden');
      el('summary-discount') && (el('summary-discount').textContent = '—');
    }

    el('summary-tax') && (el('summary-tax').textContent = fmt(totals.tax));
    el('summary-grand') && (el('summary-grand').textContent = fmt(totals.grand));

    // Coupon message
    const msg = el('coupon-msg');
    if (msg){
      msg.textContent = totals.couponMsg || '';
      if (totals.coupon && !totals.coupon.invalid) localStorage.setItem('cart_coupon', totals.coupon.code);
      if (!totals.coupon) localStorage.removeItem('cart_coupon');
    }

    // Free shipping
    const fsMsg = el('fs-msg'), fsBar = el('fs-bar');
    if (fsMsg){
      fsMsg.textContent = totals.fsRemaining > 0
        ? `Spend ${fmt(totals.fsRemaining)} more to get Free Shipping`
        : 'You have unlocked Free Shipping!';
    }
    if (fsBar){ fsBar.style.width = `${totals.fsPercent}%`; }
  }

  // Wire events
  document.addEventListener('click', (e)=>{
    const dec = e.target.closest('[data-dec]'); if(dec){ simpleCart.find(dec.dataset.dec).decrement(); render(); }
    const inc = e.target.closest('[data-inc]'); if(inc){ simpleCart.find(inc.dataset.inc).increment(); render(); }
    const del = e.target.closest('[data-del]'); if(del){ simpleCart.find(del.dataset.del).remove(); render(); }

    if (e.target && e.target.id === 'apply-coupon'){
      const field = document.getElementById('coupon-input');
      if (field){ localStorage.setItem('cart_coupon', (field.value||'').trim().toUpperCase()); }
      render();
    }

    if (e.target && e.target.id === 'checkout-btn'){
      const method = (document.querySelector('input[name="payment-method"]:checked')?.value) || 'whatsappCod';
      localStorage.setItem('checkout_pm', method);
      const note = document.getElementById('checkout-feedback');
      if (note){
        const friendly = method === 'whatsappCod' ? 'WhatsApp COD' : 'Cash on Delivery (Email)';
        note.textContent = `Selected payment method: ${friendly}.`;
      }

      // Build order from cart contents
      const items = getItems();
      if (!items.length) return;
      const totals = calcTotals();
      const order = {
        id: 'ORD-' + Date.now(),
        items: items.map(it => ({
          id: it.id(),
          name: it.get('name'),
          quantity: it.quantity(),
          unit: Number(it.get('price') || 0),
          subtotal: Number(it.get('price') || 0) * it.quantity()
        })),
        amount: totals.grand,
        subtotal: totals.subtotal,
        discount: totals.discount,
        shipping: 0,
        tax: totals.tax,
        coupon: totals.coupon ? totals.coupon.code : null,
        shippingMethod: null,
        buyer: null
      };

      order.currency = 'PKR';

      const buyer = {
        name: (document.getElementById('buyer-name')?.value || '').trim(),
        phone: (document.getElementById('buyer-phone')?.value || '').trim(),
        address: (document.getElementById('buyer-address')?.value || '').trim(),
        city: (document.getElementById('buyer-city')?.value || '').trim(),
        notes: (document.getElementById('checkout-notes')?.value || '').trim()
      };
      if (!buyer.name || !buyer.phone || !buyer.address || !buyer.city) {
        alert('Please enter name, phone, address, and city to proceed.');
        return;
      }
      order.buyer = buyer;

      if (window.Checkout && typeof window.Checkout.start === 'function') {
        window.Checkout.start(order, method);
      }
    }
  });

  document.addEventListener('change', (e)=>{
    const qty = e.target.closest('input[data-qty]'); if(qty){
      const item = simpleCart.find(qty.dataset.qty); item.set('quantity', Math.max(1, Number(qty.value)||1)); render();
    }
  });

  // Bind to simpleCart updates
  if (typeof simpleCart !== 'undefined'){
    simpleCart.bind('ready', render);
    simpleCart.bind('afterAdd', render);
    simpleCart.bind('update', render);
    simpleCart.bind('remove', render);
  }

  // Initialize
  // Pre-fill coupon field if a code exists in storage
  document.addEventListener('DOMContentLoaded', ()=>{
    ensureSummaryBlocks();
    const stored = localStorage.getItem('cart_coupon');
    const field = document.getElementById('coupon-input');
    if (stored && field){ field.value = stored; }
    render();
  });
})();
