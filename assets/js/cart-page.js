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

  function formatCurrency(n) {
    return '$' + Number(n).toFixed(2);
  }

  function renderItems() {
    const items = simpleCart.items();
    $rows.empty();
    if (items.length === 0) {
      $('.cart-head').addClass('hidden');
      $empty.removeClass('hidden');
      $('#cart-count').text(0);
      return;
    }
    $('.cart-head').removeClass('hidden');
    $empty.addClass('hidden');

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

  function discountAmount(subtotal) {
    if (!appliedCoupon || !coupons[appliedCoupon]) return 0;
    const c = coupons[appliedCoupon];
    let val = 0;
    if (c.type === 'percent') val = subtotal * (c.value / 100);
    else val = c.value;
    return Math.min(val, subtotal);
  }

  function updateSummary() {
    const subtotal = simpleCart.subtotal();
    $('#summary-subtotal').text(formatCurrency(subtotal));

    const discount = discountAmount(subtotal);
    if (discount > 0) {
      $('#discount-line').removeClass('hidden');
      $('#summary-discount').text('-' + formatCurrency(discount));
    } else {
      $('#discount-line').addClass('hidden');
    }

    const tax = (subtotal - discount) * TAX_RATE;
    $('#summary-tax').text(formatCurrency(tax));

    const grand = Math.max(0, subtotal - discount + tax);
    $('#summary-grand').text(formatCurrency(grand));

    const remain = FREE_SHIP_THRESHOLD - subtotal;
    const pct = Math.min(100, (subtotal / FREE_SHIP_THRESHOLD) * 100);
    $('#fs-bar').css('width', pct + '%');
    if (remain > 0) {
      $('#fs-msg').text(`Spend ${formatCurrency(remain)} more to get Free Shipping`);
    } else {
      $('#fs-msg').text(`Congrats, you're eligible for Free Shipping`);
    }
  }

  function render() {
    renderItems();
    updateSummary();
  }

  $('#apply-coupon').on('click', function () {
    const code = $('#coupon-input').val().trim().toUpperCase();
    if (!code) return;
    if (!coupons[code]) {
      $('#coupon-msg').text('Invalid coupon code').css('color', 'var(--brand-danger)');
      appliedCoupon = '';
      localStorage.removeItem('couponCode');
    } else {
      appliedCoupon = code;
      localStorage.setItem('couponCode', code);
      $('#coupon-msg').text(`Coupon ${code} applied`).css('color', 'var(--brand-success)');
    }
    render();
  });

  if (appliedCoupon) {
    $('#coupon-input').val(appliedCoupon);
    $('#coupon-msg').text(`Coupon ${appliedCoupon} applied`).css('color', 'var(--brand-success)');
  }

  $('#checkout-btn').on('click', function () {
    try {
      simpleCart.checkout();
    } catch (e) {
      const items = [];
      simpleCart.each(function (item) {
        items.push({ name: item.get('name'), price: item.get('price'), quantity: item.get('quantity') });
      });
      if (window.location.pathname !== '/checkout.html') {
        window.location.href = '/checkout.html';
      } else {
        alert('TODO: Configure checkout\n\n' + JSON.stringify(items));
      }
    }
  });

  simpleCart.bind('update', function () {
    render();
  });
  simpleCart.bind('ready', function () {
    render();
  });

  render();
});
