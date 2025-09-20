// Currency configuration for the shop.
// Use `var` and guard against existing globals so the script can be
// included multiple times without throwing "Identifier has already been
// declared" errors.
var SHOP_CURRENCY = window.SHOP_CURRENCY || 'PKR';
var SHOP_CURRENCY_SYMBOL = window.SHOP_CURRENCY_SYMBOL || '₨';
// Persist values on the `window` object for other scripts.
window.SHOP_CURRENCY = SHOP_CURRENCY;
window.SHOP_CURRENCY_SYMBOL = SHOP_CURRENCY_SYMBOL;

// Register Pakistani Rupee currency before configuring simpleCart
simpleCart.currency({
  code: SHOP_CURRENCY,
  name: 'Pakistani Rupee',
  symbol: SHOP_CURRENCY_SYMBOL
});

$(function() {
  // Initialize simpleCart
  simpleCart({
    cartColumns: [
      { attr: "name", label: "Product" },
      { attr: "price", label: "Price", view: 'currency' },
      { view: "decrement", label: false, text: "-" },
      { attr: "quantity", label: "Qty" },
      { view: "increment", label: false, text: "+" },
      { attr: "total", label: "SubTotal", view: 'currency' },
      { view: "remove", text: "Remove", label: false }
    ],
    cartStyle: "div",
    currency: SHOP_CURRENCY
  });

  // Populate order form with cart data
  $('#order-form').on('submit', function() {
    var items = [];
    simpleCart.each(function(item){
      items.push({name: item.get('name'), price: item.get('price'), quantity: item.get('quantity')});
    });
    $('#order').val(JSON.stringify(items));
  });

  // Animate cart count when items are added
  simpleCart.bind('afterAdd', function() {
    var $qty = $('.simpleCart_quantity');
    $qty.addClass('cart-bounce');
    setTimeout(function() {
      $qty.removeClass('cart-bounce');
    }, 400);
  });
});
