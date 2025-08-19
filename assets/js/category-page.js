document.addEventListener('DOMContentLoaded', async () => {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const slug = parts[1];
  const perPage = 12;
  let state = {
    page: 1,
    sort: 'featured',
    brand: [],
    inStock: false,
    priceMin: null,
    priceMax: null,
    tags: []
  };
  function parseURL() {
    const params = new URLSearchParams(window.location.search);
    state.page = parseInt(params.get('page') || '1', 10);
    if (isNaN(state.page) || state.page < 1) state.page = 1;
    state.sort = params.get('sort') || 'featured';
    state.brand = (params.get('brand') || '').split(',').filter(Boolean).map(decodeURIComponent);
    state.inStock = params.get('inStock') === 'true';
    const pmin = parseFloat(params.get('priceMin'));
    const pmax = parseFloat(params.get('priceMax'));
    state.priceMin = isNaN(pmin) ? null : pmin;
    state.priceMax = isNaN(pmax) ? null : pmax;
    if (state.priceMin !== null && state.priceMax !== null && state.priceMin > state.priceMax) {
      // swap if user provided inverted range
      const tmp = state.priceMin; state.priceMin = state.priceMax; state.priceMax = tmp;
    }
    state.tags = (params.get('tags') || '').split(',').filter(Boolean).map(decodeURIComponent);
  }
  function buildQuery(extra) {
    const params = new URLSearchParams();
    const s = {...state, ...extra};
    if (s.page) params.set('page', s.page);
    if (s.sort && s.sort !== 'featured') params.set('sort', s.sort);
    if (s.brand.length) params.set('brand', s.brand.join(','));
    if (s.inStock) params.set('inStock', 'true');
    if (s.priceMin !== null) params.set('priceMin', s.priceMin);
    if (s.priceMax !== null) params.set('priceMax', s.priceMax);
    if (s.tags.length) params.set('tags', s.tags.join(','));
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }
  function pushURL() {
    history.pushState({}, '', `${window.location.pathname}${buildQuery()}`);
  }
  function replaceURL() {
    history.replaceState({}, '', `${window.location.pathname}${buildQuery()}`);
  }
  function readForm(form) {
    const fd = new FormData(form);
    state.brand = fd.getAll('brand');
    state.tags = fd.getAll('tags');
    state.inStock = fd.get('inStock') === 'on';
    const pmin = parseFloat(fd.get('priceMin'));
    const pmax = parseFloat(fd.get('priceMax'));
    state.priceMin = isNaN(pmin) ? null : pmin;
    state.priceMax = isNaN(pmax) ? null : pmax;
    if (state.priceMin !== null && state.priceMax !== null && state.priceMin > state.priceMax) {
      const tmp = state.priceMin; state.priceMin = state.priceMax; state.priceMax = tmp;
    }
  }
  function setForm(form) {
    if (!form) return;
    form.querySelectorAll('input[name="brand"]').forEach(cb => {
      cb.checked = state.brand.includes(cb.value);
    });
    const inStockEl = form.querySelector('input[name="inStock"]');
    if (inStockEl) inStockEl.checked = state.inStock;
    const minEl = form.querySelector('input[name="priceMin"]');
    if (minEl) minEl.value = state.priceMin !== null ? state.priceMin : '';
    const maxEl = form.querySelector('input[name="priceMax"]');
    if (maxEl) maxEl.value = state.priceMax !== null ? state.priceMax : '';
    form.querySelectorAll('input[name="tags"]').forEach(cb => {
      cb.checked = state.tags.includes(cb.value);
    });
  }
  function clearFilters() {
    state.brand = [];
    state.inStock = false;
    state.priceMin = null;
    state.priceMax = null;
    state.tags = [];
    state.page = 1;
    pushURL();
    setForm(document.getElementById('filters-desktop-form'));
    setForm(document.getElementById('filters-mobile'));
    render();
  }
  parseURL();
  window.addEventListener('popstate', () => {
    parseURL();
    setForm(document.getElementById('filters-desktop-form'));
    setForm(document.getElementById('filters-mobile'));
    render(false);
  });
  try {
    await StorefrontRuntime.loadCategories();
    await StorefrontRuntime.loadProducts();
    const category = StorefrontRuntime.findCategoryBySlug(slug);
    if (!category) return render404();
    const canonicalUrl = `${window.location.origin}/c/${category.slug}/`;
    document.title = `${category.name} | 4D Cosmetics`;
    document.getElementById('canonical-link').setAttribute('href', canonicalUrl);
    const meta = document.querySelector('meta[name="description"]');
    let metaDesc = '';
    if (meta && category.descriptionHTML) {
      const tmp = document.createElement('div');
      tmp.innerHTML = category.descriptionHTML;
      metaDesc = tmp.textContent.trim().slice(0,160);
      meta.setAttribute('content', metaDesc);
    } else if (meta) meta.remove();
    document.getElementById('og-title').setAttribute('content', `${category.name} | 4D Cosmetics`);
    if (metaDesc) document.getElementById('og-description').setAttribute('content', metaDesc); else document.getElementById('og-description').remove();
    document.getElementById('og-url').setAttribute('content', canonicalUrl);
    if (category.image) document.getElementById('og-image').setAttribute('content', category.image); else document.getElementById('og-image').remove();
    const ld = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {"@type":"ListItem","position":1,"name":"Home","item":`${window.location.origin}/`},
        {"@type":"ListItem","position":2,"name":category.name,"item":canonicalUrl}
      ]
    };
    document.getElementById('ld-json').textContent = JSON.stringify(ld);
    document.getElementById('category-title').textContent = category.name;
    if (category.descriptionHTML) document.getElementById('category-description').innerHTML = category.descriptionHTML;
    const breadcrumb = document.getElementById('breadcrumb');
    breadcrumb.innerHTML = `<li class="breadcrumb-item"><a href="/">Home</a></li><li class="breadcrumb-item active" aria-current="page">${category.name}</li>`;

    // sidebar categories
    const sideList = document.getElementById('category-sidebar-list');
    const allCats = await StorefrontRuntime.loadCategories();
    const topCats = allCats.filter(c=>!c.parent).sort((a,b)=>(a.sortOrder-b.sortOrder)||a.name.localeCompare(b.name));
    const ul = document.createElement('ul'); ul.className = 'list-unstyled';
    topCats.forEach(c=>{ const li=document.createElement('li'); const a=document.createElement('a'); a.href=`/c/${c.slug}/`; a.textContent=c.name; if(c.slug===category.slug){a.classList.add('fw-bold');a.setAttribute('aria-current','page');} li.appendChild(a); ul.appendChild(li); });
    sideList.appendChild(ul);

    const productsAll = StorefrontRuntime.listProductsForCategory(slug);
    const brands = Array.from(new Set(productsAll.map(p=>p.brand).filter(Boolean))).sort();
    const tagsAll = Array.from(new Set(productsAll.flatMap(p=>p.tags||[]))).sort();
    // sanitize state for unknown values
    state.brand = state.brand.filter(b=>brands.includes(b));
    state.tags = state.tags.filter(t=>tagsAll.includes(t));
    // build filters
    function renderFilters(container, formId) {
      const form = document.createElement('form');
      form.id = formId;
      form.className = 'mb-3';
      const acc = document.createElement('div');
      acc.className = 'accordion';
      let idx=0;
      function addSection(title, bodyBuilder) {
        const item = document.createElement('div'); item.className='accordion-item';
        const h = document.createElement('h2'); h.className='accordion-header';
        const btn = document.createElement('button');
        btn.className='accordion-button collapsed';
        const collapseId = `collapse-${formId}-${idx++}`;
        btn.setAttribute('data-bs-toggle','collapse');
        btn.setAttribute('data-bs-target',`#${collapseId}`);
        btn.setAttribute('aria-controls',collapseId);
        btn.type='button';
        btn.textContent=title;
        const col = document.createElement('div');
        col.id = collapseId; col.className='accordion-collapse collapse';
        const body = document.createElement('div'); body.className='accordion-body';
        bodyBuilder(body);
        col.appendChild(body);
        h.appendChild(btn);
        item.appendChild(h); item.appendChild(col);
        acc.appendChild(item);
      }
      if (brands.length) {
        addSection('Brand', body => {
          brands.forEach(b => {
            const id = `${formId}-brand-${b.replace(/[^\w]/g,'')}`;
            const div = document.createElement('div'); div.className='form-check';
            const input = document.createElement('input'); input.className='form-check-input'; input.type='checkbox'; input.name='brand'; input.value=b; input.id=id; input.style.minWidth='44px'; input.style.minHeight='44px';
            const label = document.createElement('label'); label.className='form-check-label'; label.setAttribute('for',id); label.textContent=b; label.style.minHeight='44px'; label.style.display='flex'; label.style.alignItems='center';
            div.appendChild(input); div.appendChild(label); body.appendChild(div);
          });
        });
      }
      addSection('Availability', body => {
        const div = document.createElement('div'); div.className='form-check';
        const input = document.createElement('input'); input.className='form-check-input'; input.type='checkbox'; input.name='inStock'; input.id=`${formId}-inStock`; input.style.minWidth='44px'; input.style.minHeight='44px';
        const label = document.createElement('label'); label.className='form-check-label'; label.setAttribute('for',`${formId}-inStock`); label.textContent='Only show in-stock'; label.style.minHeight='44px'; label.style.display='flex'; label.style.alignItems='center';
        div.appendChild(input); div.appendChild(label); body.appendChild(div);
      });
      addSection('Price', body => {
        const minGroup = document.createElement('div'); minGroup.className='mb-2';
        const minLabel = document.createElement('label'); minLabel.setAttribute('for',`${formId}-priceMin`); minLabel.textContent='Min';
        const minInput = document.createElement('input'); minInput.type='number'; minInput.name='priceMin'; minInput.id=`${formId}-priceMin`; minInput.className='form-control'; minInput.style.minHeight='44px';
        minGroup.appendChild(minLabel); minGroup.appendChild(minInput); body.appendChild(minGroup);
        const maxGroup = document.createElement('div');
        const maxLabel = document.createElement('label'); maxLabel.setAttribute('for',`${formId}-priceMax`); maxLabel.textContent='Max';
        const maxInput = document.createElement('input'); maxInput.type='number'; maxInput.name='priceMax'; maxInput.id=`${formId}-priceMax`; maxInput.className='form-control'; maxInput.style.minHeight='44px';
        maxGroup.appendChild(maxLabel); maxGroup.appendChild(maxInput); body.appendChild(maxGroup);
      });
      if (tagsAll.length) {
        addSection('Tags', body => {
          tagsAll.forEach(t => {
            const id = `${formId}-tag-${t.replace(/[^\w]/g,'')}`;
            const div = document.createElement('div'); div.className='form-check';
            const input = document.createElement('input'); input.className='form-check-input'; input.type='checkbox'; input.name='tags'; input.value=t; input.id=id; input.style.minWidth='44px'; input.style.minHeight='44px';
            const label = document.createElement('label'); label.className='form-check-label'; label.setAttribute('for',id); label.textContent=t; label.style.minHeight='44px'; label.style.display='flex'; label.style.alignItems='center';
            div.appendChild(input); div.appendChild(label); body.appendChild(div);
          });
        });
      }
      form.appendChild(acc);
      if (formId !== 'filters-mobile') {
        const clear = document.createElement('button');
        clear.type='button'; clear.textContent='Clear all';
        clear.className='btn btn-link p-0';
        clear.id = 'clear-filters-desktop';
        clear.style.minHeight='44px';
        clear.style.minWidth='44px';
        form.appendChild(clear);
      }
      container.innerHTML='';
      container.appendChild(form);
    }
    renderFilters(document.getElementById('filters-desktop'),'filters-desktop-form');
    renderFilters(document.getElementById('filters-mobile'),'filters-mobile');
    setForm(document.getElementById('filters-desktop-form'));
    setForm(document.getElementById('filters-mobile'));

    document.getElementById('sort-select').innerHTML = [
      ['featured','Featured'],
      ['price_asc','Price: Low to High'],
      ['price_desc','Price: High to Low'],
      ['name_asc','Name: A–Z'],
      ['newest','Newest']
    ].map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
    document.getElementById('sort-select').value = state.sort;
    document.getElementById('sort-select').addEventListener('change', e => {
      state.sort = e.target.value;
      state.page = 1;
      pushURL();
      render();
    });

    const desktopForm = document.getElementById('filters-desktop-form');
    desktopForm.addEventListener('change', () => {
      readForm(desktopForm);
      state.page = 1;
      pushURL();
      setForm(document.getElementById('filters-mobile'));
      render();
    });
    document.getElementById('open-filters').addEventListener('click', () => {
      const oc = new bootstrap.Offcanvas('#filterDrawer');
      oc.show();
    });
    document.getElementById('apply-filters-mobile').addEventListener('click', e => {
      e.preventDefault();
      const form = document.getElementById('filters-mobile');
      readForm(form);
      state.page = 1;
      pushURL();
      setForm(document.getElementById('filters-desktop-form'));
      render();
      bootstrap.Offcanvas.getInstance(document.getElementById('filterDrawer')).hide();
    });
    document.getElementById('clear-filters-mobile').addEventListener('click', e => { e.preventDefault(); clearFilters(); bootstrap.Offcanvas.getInstance(document.getElementById('filterDrawer')).hide(); });
    document.getElementById('clear-filters-desktop').addEventListener('click', e => { e.preventDefault(); clearFilters(); });
    document.getElementById('filterDrawer').addEventListener('hidden.bs.offcanvas', () => {
      document.getElementById('open-filters').focus();
    });

    function sortProducts(arr) {
      const a = [...arr];
      switch(state.sort){
        case 'price_asc': return a.sort((x,y)=>x.price - y.price);
        case 'price_desc': return a.sort((x,y)=>y.price - x.price);
        case 'name_asc': return a.sort((x,y)=>x.name.localeCompare(y.name));
        case 'newest': return a.sort((x,y)=>{
          const dx = x.createdAt ? Date.parse(x.createdAt) : x.id;
          const dy = y.createdAt ? Date.parse(y.createdAt) : y.id;
          // use id fallback when createdAt absent
          return dy - dx;
        });
        default: return a;
      }
    }

    function filterProducts(arr) {
      return arr.filter(p => {
        if (state.brand.length && (!p.brand || !state.brand.includes(p.brand))) return false;
        if (state.inStock && !p.inStock) return false;
        if (state.priceMin !== null && p.price < state.priceMin) return false;
        if (state.priceMax !== null && p.price > state.priceMax) return false;
        if (state.tags.length) {
          const ptags = p.tags || [];
          if (!state.tags.some(t => ptags.includes(t))) return false;
        }
        return true;
      });
    }

    function render(scroll=true) {
      const grid = document.getElementById('product-grid');
      grid.innerHTML='';
      let items = filterProducts(productsAll);
      items = sortProducts(items);
      const total = items.length;
      grid.setAttribute('data-total', total);
      const productCount = document.getElementById('product-count');
      productCount.textContent = `${total} products`;
      const totalPages = Math.ceil(total / perPage) || 1;
      if (state.page > totalPages) { state.page = totalPages; replaceURL(); }
      const pageItems = StorefrontRuntime.paginateArray(items, state.page, perPage);
      if (pageItems.length === 0) {
        const p = document.createElement('p'); p.textContent = 'No products match your filters.';
        const link = document.createElement('a'); link.href='#'; link.textContent='Clear filters'; link.addEventListener('click', e=>{e.preventDefault(); clearFilters();});
        grid.appendChild(p); grid.appendChild(link);
      } else {
        pageItems.forEach(prod => {
          const col = document.createElement('div'); col.className='col-6 col-md-4 col-lg-3 mb-4';
          col.innerHTML = StorefrontRuntime.renderProductCardHTML(prod);
          grid.appendChild(col);
        });
        WishlistCompare.renderButtons(grid);
      }
      const nav = document.getElementById('pagination'); nav.innerHTML='';
      if (totalPages > 1 && pageItems.length) {
        const ulp = document.createElement('ul'); ulp.className='pagination';
        const prev = document.createElement('li'); const prevA=document.createElement('a'); prevA.className='page-link'; prevA.textContent='Previous'; prevA.style.minWidth='44px'; prevA.style.minHeight='44px';
        if (state.page === 1){ prev.className='page-item disabled'; prevA.setAttribute('aria-disabled','true'); prevA.tabIndex=-1; } else { prev.className='page-item'; prevA.href = buildQuery({page: state.page-1}); }
        prev.appendChild(prevA); ulp.appendChild(prev);
        for(let i=1;i<=totalPages;i++){
          const li=document.createElement('li'); li.className='page-item'+(i===state.page?' active':'');
          const a=document.createElement('a'); a.className='page-link'; a.textContent=i; a.style.minWidth='44px'; a.style.minHeight='44px'; if(i!==state.page) a.href=buildQuery({page:i}); li.appendChild(a); ulp.appendChild(li);
        }
        const next=document.createElement('li'); const nextA=document.createElement('a'); nextA.className='page-link'; nextA.textContent='Next'; nextA.style.minWidth='44px'; nextA.style.minHeight='44px';
        if (state.page === totalPages){ next.className='page-item disabled'; nextA.setAttribute('aria-disabled','true'); nextA.tabIndex=-1; } else { next.className='page-item'; nextA.href=buildQuery({page: state.page+1}); }
        next.appendChild(nextA); ulp.appendChild(next); nav.appendChild(ulp);
      }
      if (scroll) document.getElementById('product-grid').scrollIntoView();
    }

    render(false);
  } catch (e) {
    console.error(e);
    const container = document.querySelector('.container');
    container.innerHTML = `<div class="alert alert-danger">Error loading data. <button class="btn btn-link p-0" onclick="location.reload()">Retry</button></div>`;
  }

  function render404() {
    document.title = 'Category not found | 4D Cosmetics';
    const container = document.querySelector('.container');
    container.innerHTML = '<h1>Category not found</h1><p><a href="/">Home</a> | <a href="/categories/">Browse all categories</a></p>';
    StorefrontRuntime.loadCategories().then(cats => {
      const topCats = cats.filter(c => !c.parent);
      const wrap = document.createElement('div');
      topCats.forEach(cat => {
        const a = document.createElement('a'); a.href = `/c/${cat.slug}/`; a.textContent = cat.name; a.className = 'me-2'; wrap.appendChild(a);
      });
      container.appendChild(wrap);
    });
  }
});
