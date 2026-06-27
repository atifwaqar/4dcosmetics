// Shared site chrome (header + footer) injected on every page.
// Single source of truth: edit the markup here and it updates everywhere.
// Loaded at the top of <body> (right after the #site-header placeholder) so the
// header exists before tabs.js / cart scripts run; the footer placeholder is
// filled as soon as it is parsed (or on DOMContentLoaded).
(function () {
  var HEADER = "<div class=\"annc\" role=\"region\" aria-label=\"Site announcement\">\n  <div class=\"container-narrow annc__inner\">No Return or Exchange on Sale Items</div>\n</div>\n<header class=\"bnz-header\">\n  <div class=\"container-narrow bnz-header__row\">\n    <div></div>\n    <a class=\"bnz-logo\" href=\"/\">4D COSMETICS</a>\n    <div class=\"bnz-header__right\">\n      <form class=\"bnz-search d-none d-md-flex\" role=\"search\" action=\"/search/\" method=\"get\">\n        <input type=\"search\" name=\"q\" placeholder=\"Search\">\n        <button type=\"submit\" aria-label=\"Search\"><i class=\"fa fa-search\"></i></button>\n      </form>\n      <a class=\"bnz-icon\" href=\"/wishlist.html\" aria-label=\"Wishlist\"><i class=\"fa-regular fa-heart\"></i></a>\n      <a class=\"bnz-icon\" href=\"/cart.html\" aria-label=\"Cart\"><i class=\"fa-solid fa-bag-shopping\"></i><span class=\"bnz-badge simpleCart_quantity\">0</span></a>\n    </div>\n  </div>\n  <nav class=\"bnz-tabs\" aria-label=\"Primary\">\n    <div class=\"container-narrow\" id=\"home-tabs\"></div>\n  </nav>\n</header>";
  var FOOTER = "<footer class=\"bnz-footer\">\n  <div class=\"container-narrow\">\n    <div class=\"bnz-footer__cols\">\n      <div>\n        <h4>CONTACT US</h4>\n        <ul><li>+92 331 5033342</li><li><a href=\"mailto:info@4dcosmetics.com\">info@4dcosmetics.com</a></li></ul>\n      </div>\n      <div>\n        <h4>INFORMATION</h4>\n        <ul>\n          <li><a href=\"/track-order.html\">Track Your Order</a></li>\n          <li><a href=\"/orders.html\">My Orders</a></li>\n          <li><a href=\"/shipping.html\">Shipping Information</a></li>\n          <li><a href=\"/returns.html\">Return & Exchange Policy</a></li>\n        </ul>\n      </div>\n      <div>\n        <h4>CUSTOMER CARE</h4>\n        <ul>\n          <li><a href=\"/contact.html\">Contact Us</a></li>\n          <li><a href=\"/privacy.html\">Privacy Policy</a></li>\n        </ul>\n      </div>\n      <div>\n        <h4>NEWSLETTER SIGN UP</h4>\n        <form class=\"bnz-news\"><input type=\"email\" placeholder=\"Enter Email\" aria-label=\"Email\"><button type=\"submit\" aria-label=\"Subscribe\"><i class=\"fa-solid fa-arrow-right\"></i></button></form>\n      </div>\n    </div>\n    <div class=\"bnz-copy\">© 4D Cosmetics</div>\n  </div>\n</footer>";
  function fill(id, html) {
    var el = document.getElementById(id);
    if (el) { el.outerHTML = html; return true; }
    return false;
  }
  function injectAll() { fill('site-header', HEADER); fill('site-footer', FOOTER); }
  injectAll();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectAll, { once: true });
  }
  try { document.dispatchEvent(new CustomEvent('partials:ready')); } catch (e) {}
})();
