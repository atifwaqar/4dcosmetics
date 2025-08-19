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

document.addEventListener('DOMContentLoaded', async () => {
  try {
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
  } catch (e) {
    console.error(e);
  }
});
