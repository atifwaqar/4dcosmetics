const CART_DEBUG = (window.CART_DEBUG !== undefined) ? !!window.CART_DEBUG : true;

function log() {
  if (!CART_DEBUG) return;
  var a = Array.prototype.slice.call(arguments);
  a.unshift('[CartDrawer]');
  console.log.apply(console, a);
}

function warn() {
  if (!CART_DEBUG) return;
  var a = Array.prototype.slice.call(arguments);
  a.unshift('[CartDrawer]');
  console.warn.apply(console, a);
}

function err() {
  if (!CART_DEBUG) return;
  var a = Array.prototype.slice.call(arguments);
  a.unshift('[CartDrawer]');
  console.error.apply(console, a);
}

const $ = (s, ctx = document) => ctx.querySelector(s);
const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));

const CartDrawer = {
  el: null,
  overlay: null,
  content: null,
  isOpen: false,
  init() {
    this.el = $('.cart-drawer');
    this.overlay = $('.cart-overlay');
    this.content = $('.cart-content');

    if (!this.el) {
      warn('No cart drawer element found');
      return;
    }

    $('.cart-close', this.el)?.addEventListener('click', () => this.close());
    this.overlay?.addEventListener('click', () => this.close());

    document.addEventListener('cart:toggle', () => this.toggle());
    document.addEventListener('cart:open', () => this.open());
    document.addEventListener('cart:close', () => this.close());

    log('CartDrawer initialized');
  },
  open() {
    if (this.isOpen) return;
    this.el?.classList.add('open');
    this.overlay?.classList.add('visible');
    this.isOpen = true;
  },
  close() {
    if (!this.isOpen) return;
    this.el?.classList.remove('open');
    this.overlay?.classList.remove('visible');
    this.isOpen = false;
  },
  toggle() {
    this.isOpen ? this.close() : this.open();
  },
  render(items) {
    if (!this.content) return;
    if (!items || !items.length) {
      this.content.innerHTML = '<p class="empty">Your cart is empty</p>';
      return;
    }

    this.content.innerHTML = items.map(item => `
      <div class="cart-item">
        <img src="${item.image || ''}" alt="${item.name || ''}">
        <div class="info">
          <p>${item.name || ''}</p>
          <span>${item.quantity} × ${item.price}</span>
        </div>
      </div>
    `).join('');
  }
};

// simpleCart integration
if (typeof simpleCart !== 'undefined') {
  simpleCart.bind('afterAdd', function () {
    log('simpleCart afterAdd -> opening drawer');
    CartDrawer.open();
  });

  simpleCart.bind('update', function () {
    const items = simpleCart.items().map(i => ({
      name: i.get('name'),
      quantity: i.get('quantity'),
      price: i.get('price'),
      image: i.get('image')
    }));
    CartDrawer.render(items);
  });
}

window.CartDrawer = CartDrawer;

document.addEventListener('DOMContentLoaded', () => CartDrawer.init());
