async function ensureSearchEngine() {
  if (window.SearchEngine) return;
  await new Promise(res => {
    const s = document.createElement('script');
    s.src = '/assets/js/search.js';
    s.onload = res;
    document.head.appendChild(s);
  });
}

function debounce(fn, delay){ let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args),delay); }; }

document.documentElement.classList.add('js');

function navEvent(type, data = {}) {
  try {
    if (window.gtag) {
      window.gtag('event', type, data);
    } else if (window.dataLayer) {
      window.dataLayer.push({ event: type, ...data });
    }
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
    const s = document.createElement('script');
    s.type = 'module';
    s.src = '/assets/js/search-autocomplete.js';
    document.head.appendChild(s);
    await ensureSearchEngine();
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
      const form = document.createElement('form');
      form.className = 'd-flex ms-lg-3 position-relative';
      form.setAttribute('role', 'search');
      form.addEventListener('submit', e => {
        e.preventDefault();
        const q = input.value.trim();
        if (q) window.location.href = `/search/?q=${encodeURIComponent(q)}`;
      });
      const input = document.createElement('input');
      input.type = 'search';
      input.className = 'form-control';
      input.placeholder = 'Search products';
      input.id = 'header-search';
      input.autocomplete = 'off';
      input.setAttribute('aria-label', 'Search products');
      input.setAttribute('aria-expanded', 'false');
      form.appendChild(input);
      const panel = document.createElement('div');
      panel.id = 'search-autocomplete';
      panel.className = 'list-group position-absolute top-100 start-0 w-100 d-none';
      panel.setAttribute('role', 'listbox');
      form.appendChild(panel);
      collapse.appendChild(form);

      let activeIndex = -1;
      function hidePanel(){ panel.classList.add('d-none'); input.setAttribute('aria-expanded','false'); input.removeAttribute('aria-activedescendant'); activeIndex=-1; }
      function setActive(){ Array.from(panel.children).forEach((el,i)=>{ if(i===activeIndex){ el.classList.add('active'); input.setAttribute('aria-activedescendant', el.id);} else el.classList.remove('active'); }); }
      const update = debounce(async () => {
        const q = input.value.trim();
        if (!q){ hidePanel(); return; }
        const results = await SearchEngine.search(q);
        panel.innerHTML='';
        activeIndex=-1;
        if (results.length) {
          results.slice(0,8).forEach((prod,i)=>{
            const a=document.createElement('a');
            a.href=`/p/${prod.slug}`;
            a.className='list-group-item list-group-item-action d-flex align-items-center';
            a.setAttribute('role','option');
            a.id=`ac-item-${i}`;
            const img=document.createElement('img'); img.src=prod.images[0]; img.alt=''; img.width=40; img.height=40; img.loading='lazy'; img.className='me-2'; a.appendChild(img);
            const span=document.createElement('span'); span.textContent=prod.name; a.appendChild(span);
            if(prod.brand){ const b=document.createElement('small'); b.className='text-muted ms-1'; b.textContent=prod.brand; a.appendChild(b); }
            const price=document.createElement('span'); price.className='ms-auto'; price.textContent=StorefrontRuntime.formatPrice(prod.price, prod.currency); a.appendChild(price);
            panel.appendChild(a);
          });
          const view=document.createElement('a'); view.href=`/search/?q=${encodeURIComponent(q)}`; view.className='list-group-item list-group-item-action'; view.textContent=`View all results for "${q}"`; panel.appendChild(view);
        } else {
          const div=document.createElement('div'); div.className='list-group-item'; div.textContent='No matches. Press Enter to search all results.'; panel.appendChild(div);
        }
        panel.classList.remove('d-none');
        input.setAttribute('aria-expanded','true');
      },150);

      input.addEventListener('input', update);
      input.addEventListener('focus', update);
      input.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown' && !panel.classList.contains('d-none')) { e.preventDefault(); activeIndex=(activeIndex+1)%panel.children.length; setActive(); }
        else if (e.key === 'ArrowUp' && !panel.classList.contains('d-none')) { e.preventDefault(); activeIndex=(activeIndex-1+panel.children.length)%panel.children.length; setActive(); }
        else if (e.key === 'Enter') {
          if (!panel.classList.contains('d-none') && activeIndex>=0) {
            const el=panel.children[activeIndex]; const href=el.getAttribute('href'); if(href) window.location.href=href; else window.location.href=`/search/?q=${encodeURIComponent(input.value.trim())}`;
          } else if (input.value.trim()) {
            window.location.href=`/search/?q=${encodeURIComponent(input.value.trim())}`;
          }
        } else if (e.key === 'Escape') { hidePanel(); }
      });
      document.addEventListener('click', e => { if(!form.contains(e.target)) hidePanel(); });
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
