const TAX_RATE = 0.10;
const FREE_SHIP_THRESHOLD = 100;

const coupons = {
  'WELCOME10': { type: 'percent', value: 10 },
  'OFF50': { type: 'flat', value: 50 }
};

$(function () {
  const $rows = $('#cart-rows');
  const $empty = $('#empty-state');
  let appliedCoupon = localStorage.getItem('couponCode') || '';

  function getCurrency(){
    return (window.Checkout && window.Checkout.config && window.Checkout.config.currencyDefault) || 'USD';
  }

  function cartItems(){
    const items = [];
    simpleCart.each(function (item){
      items.push({
        id: item.id(),
        name: item.get('name'),
        quantity: item.get('quantity'),
        unit: +item.get('price'),
        subtotal: +item.total()
      });
    });
    return items;
  }

  function getTotals(){
    const subtotal = +simpleCart.total() || 0;
    const discountObj = computeDiscount(subtotal);
    const discount = discountObj.amount;
    const taxBase = Math.max(0, subtotal - discount);
    const tax = taxBase * TAX_RATE;
    const grand = Math.max(0, taxBase + tax);
    return { subtotal, discount, tax, shipping: 0, grandTotal: grand };
  }

  function formatCurrency(n) {
    return '$' + Number(n).toFixed(2);
  }

  function fmt(n) {
    return formatCurrency(n);
  }

  function renderItems() {
    const items = simpleCart.items();
    $rows.empty();
    if (items.length === 0) {
      $('.cart-head').addClass('hidden');
      $empty.removeClass('hidden');
      $('#cart-count').text(0);
      $('#checkout-btn').prop('disabled', true);
      return;
    }
    $('.cart-head').removeClass('hidden');
    $empty.addClass('hidden');
    $('#checkout-btn').prop('disabled', false);

    items.forEach(item => {
      const row = $('<div class="row"></div>').attr('data-id', item.id());

      const itemCol = $('<div class="item"></div>');
      const thumb = $('<img class="thumb" alt="">').attr('src', item.get('thumb') || item.get('image') || '').attr('alt', item.get('name'));
      const info = $('<div class="info"></div>');
      const title = $('<div class="title"></div>').text(item.get('name'));
      const metaText = item.get('description') || item.get('meta') || '';
      const meta = $('<div class="meta"></div>').text(metaText);
      info.append(title);
      if (metaText) info.append(meta);
      itemCol.append(thumb, info);

      const priceCol = $('<div class="price"></div>').text(formatCurrency(item.get('price')));

      const qtyCol = $('<div class="qty"></div>');
      const minus = $('<button type="button">-</button>');
      const qtyInput = $('<input type="text" inputmode="numeric">').val(item.get('quantity'));
      const plus = $('<button type="button">+</button>');
      qtyCol.append(minus, qtyInput, plus);

      const totalCol = $('<div class="line-total"></div>').text(formatCurrency(item.total()));

      const removeCol = $('<div class="remove" title="Remove">×</div>');

      row.append(itemCol, priceCol, qtyCol, totalCol, removeCol);
      $rows.append(row);

      minus.on('click', function () {
        const q = item.get('quantity') - 1;
        if (q <= 0) item.remove();
        else item.set('quantity', q);
        simpleCart.update();
      });
      plus.on('click', function () {
        item.set('quantity', item.get('quantity') + 1);
        simpleCart.update();
      });
      qtyInput.on('change', function () {
        let val = parseInt(qtyInput.val(), 10);
        if (isNaN(val) || val <= 0) {
          item.remove();
        } else {
          item.set('quantity', val);
        }
        simpleCart.update();
      });
      removeCol.on('click', function () {
        item.remove();
        simpleCart.update();
      });
    });

    $('#cart-count').text(simpleCart.quantity());
  }

  function computeDiscount(subtotal) {
    if (!appliedCoupon || !coupons[appliedCoupon]) return { amount: 0, label: '' };
    const c = coupons[appliedCoupon];
    let amount = c.type === 'percent' ? subtotal * (c.value / 100) : c.value;
    amount = Math.min(amount, subtotal);
    return { amount, label: appliedCoupon };
  }

  function updateSummary(){
    var subtotal = +simpleCart.total() || 0;

    var discountObj = computeDiscount(subtotal);
    var discount = discountObj.amount;

    var taxBase = Math.max(0, subtotal - discount);
    var tax = taxBase * TAX_RATE;
    var grand = Math.max(0, taxBase + tax);

    $('#summary-subtotal').text(fmt(subtotal));

    if (discount > 0){
      $('#discount-line').removeClass('hidden');
      $('#summary-discount').text('-' + fmt(discount).replace('$','$'));
      $('#coupon-msg').text('Applied: ' + discountObj.label).css('color','var(--brand-success)');
    } else {
      $('#discount-line').addClass('hidden');
      $('#coupon-msg').text('').css('color','');
    }

    $('#summary-tax').text(fmt(tax));
    $('#summary-grand').text(fmt(grand));

    var progress = Math.max(0, Math.min(100, (subtotal / FREE_SHIP_THRESHOLD) * 100));
    $('#fs-bar').css('width', progress + '%');
    if (subtotal >= FREE_SHIP_THRESHOLD){
      $('#fs-msg').text("Congrats, you're eligible for Free Shipping");
    } else {
      var remain = FREE_SHIP_THRESHOLD - subtotal;
      $('#fs-msg').text('Spend ' + fmt(remain) + ' more to get Free Shipping');
    }
  }

  function renderCart() {
    renderItems();
    updateSummary();
  }

  $('#apply-coupon').on('click', function () {
    const code = $('#coupon-input').val().trim().toUpperCase();
    if (!code) return;
    if (!coupons[code]) {
      appliedCoupon = '';
      localStorage.removeItem('couponCode');
      renderCart();
      $('#coupon-msg').text('Invalid coupon code').css('color', 'var(--brand-danger)');
    } else {
      appliedCoupon = code;
      localStorage.setItem('couponCode', code);
      renderCart();
    }
  });

  if (appliedCoupon) {
    $('#coupon-input').val(appliedCoupon);
  }

  $('#checkout-btn').on('click', function () {
    const items = cartItems();
    if (items.length === 0) return;
    const totals = getTotals();
    const order = {
      id: 'ORD-' + Date.now(),
      currency: getCurrency(),
      items: items,
      amount: totals.grandTotal,
      subtotal: totals.subtotal,
      discount: totals.discount,
      shipping: totals.shipping,
      tax: totals.tax,
      coupon: appliedCoupon || null,
      shippingMethod: null,
      buyer: null,
      fx: { base: 'USD', target: 'PKR', rate: (window.Checkout && window.Checkout.config ? window.Checkout.config.pkConversionRate : 0) }
    };
    const method = $('input[name="pm"]:checked').val();
    if (window.Checkout && typeof window.Checkout.start === 'function') {
      window.Checkout.start(order, method);
    }
  });

  simpleCart.bind('update', renderCart);
  simpleCart.bind('ready', renderCart);
  simpleCart.bind('afterAdd', renderCart);
});
