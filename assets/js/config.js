// Register Pakistani Rupee currency before configuring simpleCart
simpleCart.currency({
  code: 'PKR',
  name: 'Pakistani Rupee',
  symbol: 'Rs.'
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
    currency: "PKR"
  });

  // Load products and render
  $.getJSON('./assets/data/products.json', function(data) {
    simpleStore.setProducts(data.products);
    var products = simpleStore.products;

    if ($('#featured-products').length) {
      renderProducts(products.slice(0,4), $('#featured-products'));
    }

    if ($('#products-list').length) {
      renderProducts(products, $('#products-list'));
    }
  });

  function renderProducts(products, container) {
    var row = $('<div class="row"></div>');
    products.forEach(function(p){
      var card = $('<div class="col-md-4 col-sm-6 mb-4">\n        <div class="card h-100 simpleCart_shelfItem">\n          <img class="card-img-top item_thumb" alt="">\n          <div class="card-body d-flex flex-column">\n            <h5 class="card-title item_name"></h5>\n            <p class="item_price text-primary"></p>\n            <p class="card-text item_description"></p>\n            <a class="btn btn-primary mt-auto item_add" href="javascript:;">Add to Cart</a>\n          </div>\n        </div>\n      </div>');
      card.find('.item_name').text(p.name);
      card.find('.item_price').text(new Intl.NumberFormat('en-PK', {style: 'currency', currency: 'PKR'}).format(p.price));
      card.find('.item_description').text(p.description);
      card.find('.item_thumb').attr('src', p.image).attr('alt', p.name);
      row.append(card);
    });
    container.html(row);
  }

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
