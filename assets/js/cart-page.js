/* Cart page logic for 4D Cosmetics */
(function($){
  "use strict";

  // ---- Config ----
  var TAX_RATE = 0.10;                  // 10%
  var FREE_SHIP_THRESHOLD = 100;        // USD
  var COUPONS = {
    "WELCOME10": { type: "percent", value: 10 },
    "OFF50":     { type: "flat",    value: 50 }
  };
  var LS_COUPON_KEY = "cart_applied_coupon";

  function fmt(n){ return "$" + (Math.round(n * 100) / 100).toFixed(2); }

  function getAppliedCoupon(){
    var code = (localStorage.getItem(LS_COUPON_KEY) || "").trim().toUpperCase();
    return code && COUPONS[code] ? { code: code, rule: COUPONS[code] } : null;
  }
  function setAppliedCoupon(code){
    if(code){ localStorage.setItem(LS_COUPON_KEY, code.toUpperCase()); }
    else { localStorage.removeItem(LS_COUPON_KEY); }
  }
  function computeDiscount(subtotal){
    var applied = getAppliedCoupon();
    if(!applied) return { amount: 0, label: "" };
    var rule = applied.rule, val = 0;
    if(rule.type === "percent") val = subtotal * (rule.value/100);
    if(rule.type === "flat")    val = rule.value;
    return { amount: Math.min(val, subtotal), label: applied.code };
  }

  function renderCart(){
    var $rows = $("#cart-rows").empty();
    var count = simpleCart.quantity();
    $("#cart-count").text(count);

    $("#checkout-btn").prop("disabled", count === 0);

    if(count === 0){
      $("#empty-state").removeClass("hidden");
      $(".cart-head").addClass("hidden");
    } else {
      $("#empty-state").addClass("hidden");
      $(".cart-head").removeClass("hidden");
    }

    simpleCart.each(function(item){
      var id     = item.id();
      var name   = item.get("name") || "Product";
      var price  = +item.get("price") || 0;
      var image  = item.get("image") || "/assets/img/products/placeholder.jpg";
      var desc   = item.get("description") || "";
      var qty    = item.quantity();
      var total  = price * qty;

      var $row = $('<div class="row" data-id="'+id+'">\
        <div class="item">\
          <img class="thumb" alt="'+$("<div>").text(name).html()+'" src="'+image+'">\
          <div class="stack">\
            <div class="title">'+name+'</div>\
            <div class="meta">'+desc+'</div>\
          </div>\
          <span class="remove" title="Remove" aria-label="Remove" role="button">&times;</span>\
        </div>\
        <div class="price hide-sm">'+fmt(price)+'</div>\
        <div class="qty">\
          <button class="btn-minus" aria-label="Decrease">−</button>\
          <input class="qty-input" type="number" min="0" step="1" value="'+qty+'">\
          <button class="btn-plus" aria-label="Increase">+</button>\
        </div>\
        <div class="line-total">'+fmt(total)+'</div>\
      </div>');

      $rows.append($row);
    });

    updateSummary();
  }

  function updateSummary(){
    var subtotal = +simpleCart.total() || 0; // <-- correct API for this build

    var discountObj = computeDiscount(subtotal);
    var discount = discountObj.amount;

    var taxBase = Math.max(0, subtotal - discount);
    var tax = taxBase * TAX_RATE;
    var grand = Math.max(0, taxBase + tax);

    $("#summary-subtotal").text(fmt(subtotal));
    if(discount > 0){
      $("#discount-line").removeClass("hidden");
      $("#summary-discount").text("-" + fmt(discount).replace("$","$"));
      $("#coupon-msg").text("Applied: " + discountObj.label);
    }else{
      $("#discount-line").addClass("hidden");
      $("#coupon-msg").text("");
    }
    $("#summary-tax").text(fmt(tax));
    $("#summary-grand").text(fmt(grand));

    var progress = Math.max(0, Math.min(100, (subtotal / FREE_SHIP_THRESHOLD) * 100));
    $("#fs-bar").css("width", progress + "%");
    if(subtotal >= FREE_SHIP_THRESHOLD){
      $("#fs-msg").text("Congrats, you're eligible for Free Shipping");
    } else {
      var remain = FREE_SHIP_THRESHOLD - subtotal;
      $("#fs-msg").text("Spend " + fmt(remain) + " more to get Free Shipping");
    }
  }

  function applyCoupon(code){
    code = (code || "").trim().toUpperCase();
    if(!code){
      $("#coupon-msg").text("Enter a code."); setAppliedCoupon(null); updateSummary(); return;
    }
    if(!COUPONS[code]){
      $("#coupon-msg").text("Invalid code."); setAppliedCoupon(null);
    } else {
      $("#coupon-msg").text("Applied: " + code); setAppliedCoupon(code);
    }
    updateSummary();
  }

  // Events
  $(document)
    .on("click", ".btn-plus", function(){
      var id = $(this).closest(".row").data("id");
      var item = simpleCart.find({ id: id })[0];
      if(item){ item.increment(); renderCart(); }
    })
    .on("click", ".btn-minus", function(){
      var id = $(this).closest(".row").data("id");
      var item = simpleCart.find({ id: id })[0];
      if(item){
        if(item.quantity() <= 1){ item.remove(); }
        else { item.decrement(); }
        renderCart();
      }
    })
    .on("change", ".qty-input", function(){
      var id = $(this).closest(".row").data("id");
      var val = Math.max(0, parseInt($(this).val(), 10) || 0);
      var item = simpleCart.find({ id: id })[0];
      if(item){
        if(val <= 0) item.remove();
        else item.quantity(val);
        renderCart();
      }
    })
    .on("click", ".remove", function(){
      var id = $(this).closest(".row").data("id");
      var item = simpleCart.find({ id: id })[0];
      if(item){ item.remove(); renderCart(); }
    });

  $("#apply-coupon").on("click", function(){ applyCoupon($("#coupon-input").val()); });
  $("#coupon-input").on("keypress", function(e){ if(e.which === 13){ $("#apply-coupon").click(); } });

  $("#checkout-btn").on("click", function(){
    try{
      if(typeof simpleCart.checkout === "function"){ simpleCart.checkout(); }
      else { alert("Checkout not configured in this demo.\nTotal: " + $("#summary-grand").text()); }
    }catch(err){
      console.error(err); alert("Checkout is unavailable right now.");
    }
  });

  // Bind to simpleCart lifecycle
  simpleCart.bind("ready", renderCart);
  simpleCart.bind("update", renderCart);
  simpleCart.bind("afterAdd", renderCart);

  // Initial render after DOM ready
  $(function(){ var c = getAppliedCoupon(); if(c){ $("#coupon-input").val(c.code); } renderCart(); });

})(jQuery);
