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
  $.getJSON('./assets/data/products.json', function(products) {
    simpleStore.setProducts(products);
    var productsList = simpleStore.products;

    if ($('#featured-products').length) {
      renderProducts(productsList.slice(0,4), $('#featured-products'));
    }

    if ($('#products-list').length) {
      renderProducts(productsList, $('#products-list'));
    }
  });

  function renderProducts(products, container) {
    var row = $('<div class="row"></div>');
    products.forEach(function(p){
      var card = $('<div class="col-md-4 col-sm-6 mb-4">\n        <div class="card h-100 simpleCart_shelfItem">\n          <img class="card-img-top item_thumb" alt="">\n          <div class="card-body d-flex flex-column">\n            <h5 class="card-title item_name"></h5>\n            <p class="item_price text-primary"></p>\n            <p class="card-text item_description"></p>\n            <a class="btn btn-primary mt-auto item_add" href="javascript:;">Add to Cart</a>\n          </div>\n        </div>\n      </div>');
        card.find('.item_name').text(p.name);
        card.find('.item_price').text(new Intl.NumberFormat('en', {style: 'currency', currency: p.currency}).format(p.price));
        card.find('.item_description').text(p.shortDescription);
        card.find('.item_thumb')
          .attr('src', p.images[0])
          .attr('alt', p.name)
          .attr('loading', 'lazy')
          .css('object-fit','cover')
          .css('aspect-ratio','1/1');
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
