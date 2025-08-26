document.documentElement.classList.add('js');

function navEvent(type, data = {}) {
  try {
    window.analytics && window.analytics.dispatch(type, { meta: data }, 'analytics');
  } catch (e) {
    console.warn('analytics error', e);
  }
}

function initMobileNav() {
  const mq = window.matchMedia('(max-width:1024px)');
  if (!mq.matches) return;
  const navContainer = document.querySelector('.nav-container');
  const navLinks = document.querySelector('.nav-links');
  const navActions = document.querySelector('.nav-actions');
  if (!navContainer || !navLinks || !navActions) return;

  const searchForm = navActions.querySelector('.search-form');
  const cartLink = navActions.querySelector('.cart-link');

  const btn = document.createElement('button');
  btn.className = 'nav-toggle';
  btn.setAttribute('aria-label', 'Open menu');
  btn.setAttribute('aria-controls', 'mobile-drawer');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<span class="bar"></span><span class="bar"></span><span class="bar"></span>';
  navContainer.insertBefore(btn, navContainer.firstChild);

  const overlay = document.createElement('div');
  overlay.className = 'drawer-overlay';
  document.body.appendChild(overlay);

  const drawer = document.createElement('nav');
  drawer.id = 'mobile-drawer';
  drawer.className = 'mobile-drawer';
  drawer.setAttribute('aria-label', 'Primary');

  const closeBtn = document.createElement('button');
  closeBtn.className = 'drawer-close';
  closeBtn.textContent = 'Close';
  closeBtn.setAttribute('aria-label', 'Close menu');
  drawer.appendChild(closeBtn);

  if (searchForm) {
    const s = searchForm.cloneNode(true);
    s.classList.add('drawer-search');
    s.addEventListener('submit', () => {
      const q = s.querySelector('input')?.value.trim();
      navEvent('search_submit', { query: q });
      close('search');
    });
    drawer.appendChild(s);
  }

  if (cartLink) {
    const cart = cartLink.cloneNode(true);
    drawer.appendChild(cart);
  }

  const primary = navLinks.cloneNode(true);
  drawer.appendChild(primary);

  const secondary = document.createElement('div');
  secondary.className = 'drawer-secondary';
  secondary.innerHTML = '<a href="/about.html">About</a><a href="/contact.html">Contact</a><a href="/docs/how-to-choose-serum.html">Help</a>';
  drawer.appendChild(secondary);

  drawer.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => navEvent('nav_link_click', { label: a.textContent.trim() }));
  });

  document.body.appendChild(drawer);

  let lastFocus = null;
  function focusables() {
    return drawer.querySelectorAll('a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])');
  }
  function trap(e) {
    if (e.key === 'Tab') {
      const f = focusables();
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close('esc');
    }
  }

  function open() {
    lastFocus = document.activeElement;
    btn.setAttribute('aria-expanded', 'true');
    drawer.classList.add('open');
    overlay.classList.add('open');
    const sb = window.innerWidth - document.documentElement.clientWidth;
    document.body.classList.add('drawer-open');
    if (sb > 0) document.body.style.paddingRight = sb + 'px';
    const f = focusables();
    if (f.length) f[0].focus();
    document.addEventListener('keydown', trap);
    navEvent('menu_open');
  }

  function close(method = 'close') {
    btn.setAttribute('aria-expanded', 'false');
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    document.body.classList.remove('drawer-open');
    document.body.style.paddingRight = '';
    document.removeEventListener('keydown', trap);
    if (lastFocus) lastFocus.focus();
    navEvent('menu_close', { method });
  }

  btn.addEventListener('click', () => {
    drawer.classList.contains('open') ? close('toggle') : open();
  });
  closeBtn.addEventListener('click', () => close('close_btn'));
  overlay.addEventListener('click', () => { navEvent('overlay_close'); close('overlay'); });
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    document.querySelectorAll('input[type="search"]').forEach(i => i.setAttribute('autocomplete','off'));
    const categories = await StorefrontRuntime.loadCategories();
    const topCats = categories.filter(c => !c.parent)
      .sort((a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name));

    const navList = document.querySelector('.navbar-nav');
    if (navList) {
      const li = document.createElement('li');
      li.className = 'nav-item dropdown';
        li.innerHTML = `<a class="nav-link dropdown-toggle" href="#" id="shopDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">Shop</a><ul class="dropdown-menu" aria-labelledby="shopDropdown"></ul>`;
        const menu = li.querySelector('.dropdown-menu');
        const toggle = li.querySelector('#shopDropdown');
        topCats.forEach(cat => {
          const link = document.createElement('a');
          link.className = 'dropdown-item';
          link.href = `/c/${cat.slug}/`;
          link.textContent = cat.name;
          menu.appendChild(link);
        });
        const div = document.createElement('div');
        div.className = 'dropdown-divider';
        menu.appendChild(div);
        const browse = document.createElement('a');
        browse.className = 'dropdown-item';
        browse.href = '/categories/';
        browse.textContent = 'Browse all categories';
        menu.appendChild(browse);
        navList.insertBefore(li, navList.firstChild ? navList.children[1] : null);
        const dd = bootstrap.Dropdown.getOrCreateInstance(toggle);
        toggle.addEventListener('keydown', e => {
          if (e.key === 'Escape') {
            dd.hide();
            toggle.focus();
          }
        });
        menu.addEventListener('keydown', e => {
          if (e.key === 'Escape') {
            dd.hide();
            toggle.focus();
          } else if (e.key === ' ') {
            e.preventDefault();
            if (e.target && e.target.tagName === 'A') {
              e.target.click();
            }
          }
        });
        toggle.addEventListener('shown.bs.dropdown', () => {
          toggle.setAttribute('aria-expanded', 'true');
        });
        toggle.addEventListener('hidden.bs.dropdown', () => {
          toggle.setAttribute('aria-expanded', 'false');
          toggle.focus();
        });

      if (window.location.pathname.startsWith('/c/')) {
        const slug = window.location.pathname.split('/')[2];
        const active = Array.from(menu.children).find(a => a.getAttribute('href') === `/c/${slug}/`);
        if (active) {
          active.classList.add('active');
          li.querySelector('#shopDropdown').classList.add('active');
        }
      }
    }

    const collapse = document.getElementById('navbarNav');
    if (collapse) {
      const input = document.createElement('input');
      input.type = 'search';
      input.className = 'form-control';
      input.placeholder = 'Search products';
      input.id = 'header-search';
      input.autocomplete = 'off';
      input.setAttribute('aria-label', 'Search products');

      const form = document.createElement('form');
      form.className = 'search-form d-flex ms-lg-3 position-relative';
      form.setAttribute('role', 'search');
      form.addEventListener('submit', e => {
        e.preventDefault();
        const q = input.value.trim();
        if (q) window.location.href = `/search/?q=${encodeURIComponent(q)}`;
      });
      form.appendChild(input);
      collapse.appendChild(form);
    }

      const footerContainer = document.querySelector('footer .container');
      if (footerContainer) {
        const list = document.createElement('div');
        list.className = 'mt-3 footer-categories';
        topCats.forEach(cat => {
          const a = document.createElement('a');
          a.href = `/c/${cat.slug}/`;
          a.textContent = cat.name;
          a.className = 'me-2';
          list.appendChild(a);
        });
        footerContainer.appendChild(list);
      }

      if (window.matchMedia('(max-width:1024px)').matches) {
        initMobileNav();
      }
    } catch (e) {
      console.error(e);
    }
  });
