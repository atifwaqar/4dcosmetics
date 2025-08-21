(function(){
  const PAGE_SIZE = 12;

  // ---- helpers
  const qs = new URLSearchParams(location.search);
  function getState(){
    return {
      brands: (qs.getAll('brand') || qs.get('brand')?.split(',') || []).filter(Boolean),
      min: Number(qs.get('min') || '') || null,
      max: Number(qs.get('max') || '') || null,
      sale: qs.get('sale') === '1',
      is_new: qs.get('new') === '1',
      stock: qs.get('stock') === '1',
      rating: Number(qs.get('rating') || 0),
      sort: qs.get('sort') || 'featured',
      page: Math.max(1, Number(qs.get('page') || 1))
    };
  }
  function setState(next){
    const s = new URLSearchParams();
    if(next.brands?.length) s.set('brand', next.brands.join(','));
    if(next.min != null) s.set('min', next.min);
    if(next.max != null) s.set('max', next.max);
    if(next.sale) s.set('sale','1');
    if(next.is_new) s.set('new','1');
    if(next.stock) s.set('stock','1');
    if(next.rating) s.set('rating', String(next.rating));
    if(next.sort && next.sort!=='featured') s.set('sort', next.sort);
    if(next.page && next.page>1) s.set('page', String(next.page));
    const url = location.pathname + (s.toString()?`?${s.toString()}`:'');
    history.pushState(null,'',url);
    render(); // re-render on update
  }

  // ---- data load (adapt to your runtime)
  async function loadProducts(){
    // Prefer a runtime getter if available; else use global.
    if(window.Storefront?.getCategoryProducts){
      return await window.Storefront.getCategoryProducts();
    }
    return window.__CATEGORY_PRODUCTS__ || window.__ALL_PRODUCTS__ || [];
  }

  function applyFilters(items, state){
    return items.filter(p=>{
      if(state.brands?.length && (!p.brand || !state.brands.includes(p.brand))) return false;
      const price = Number(p.price?.current ?? p.price ?? 0);
      if(state.min!=null && price < state.min) return false;
      if(state.max!=null && price > state.max) return false;
      if(state.sale && !(p.price?.old && price < p.price.old)) return false;
      if(state.is_new && !(p.is_new || p.tags?.includes?.('new'))) return false;
      if(state.stock && (p.available === false || p.stock === 0)) return false;
      const r = Number(p.rating?.value ?? p.rating ?? 0);
      if(state.rating && r < state.rating) return false;
      return true;
    });
  }

  function applySort(items, sort){
    const arr = items.slice();
    switch(sort){
      case 'price_asc': arr.sort((a,b)=>(a.price?.current??a.price??0)-(b.price?.current??b.price??0)); break;
      case 'price_desc': arr.sort((a,b) => (b.price?.current??b.price??0)-(a.price?.current??a.price??0)); break;
      case 'name_asc': arr.sort((a,b)=>String(a.name||a.title).localeCompare(String(b.name||b.title))); break;
      case 'newest': arr.sort((a,b)=>(b.created_at||0)-(a.created_at||0)); break;
      default: /* featured: leave as-is */ break;
    }
    return arr;
  }

  function paginate(items, page){
    const start = (page-1)*PAGE_SIZE;
    return { slice: items.slice(start, start+PAGE_SIZE), total: items.length, pageCount: Math.max(1, Math.ceil(items.length/PAGE_SIZE)) };
  }

  function renderGrid(items){
    const grid = document.getElementById('product-grid');
    grid.innerHTML = items.map(p=>window.ProductCard.renderProductCard(p)).join('');
  }

  function renderCount(total){
    const el = document.getElementById('product-count');
    if(!el) return;
    el.textContent = `${total} product${total===1?'':'s'}`;
  }

  function renderPager(page, pageCount){
    const ul = document.getElementById('pager');
    if(!ul) return;
    const mk = (label, targetPage, disabled=false, active=false)=>(
      `<li class="page-item ${disabled?'disabled':''} ${active?'active':''}">
         <a class="page-link" href="#" data-page="${targetPage}">${label}</a>
       </li>`
    );
    let html = mk('«', Math.max(1,page-1), page===1, false);
    for(let i=1;i<=pageCount;i++){
      if(i===1 || i===pageCount || Math.abs(i-page)<=1){
        html += mk(String(i), i, false, i===page);
      } else if (i===2 && page>3 || i===pageCount-1 && page<pageCount-2){
        html += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
      }
    }
    html += mk('»', Math.min(pageCount,page+1), page===pageCount, false);
    ul.innerHTML = html;
    ul.querySelectorAll('a[data-page]').forEach(a=>{
      a.addEventListener('click', (e)=>{ e.preventDefault(); const to = Number(a.dataset.page); const st = getState(); st.page = to; setState(st); });
    });
  }

  function renderFiltersUI(items, state){
    const brands = Array.from(new Set(items.map(p=>p.brand).filter(Boolean))).sort((a,b)=>String(a).localeCompare(String(b)));
    const groups = [
      { id:'brand', title:'Brand', html: brands.map(b=>`
        <label><input type="checkbox" name="brand" value="${b}" ${state.brands.includes(b)?'checked':''}> ${b}</label>`).join('') },
      { id:'price', title:'Price', html: `
        <div class="d-flex gap-2">
          <input type="number" inputmode="numeric" class="form-control form-control-sm" id="min-price" placeholder="Min" value="${state.min??''}">
          <input type="number" inputmode="numeric" class="form-control form-control-sm" id="max-price" placeholder="Max" value="${state.max??''}">
        </div>`},
      { id:'availability', title:'Availability', html: `
        <label><input type="checkbox" id="in-stock" ${state.stock?'checked':''}> In stock</label>`},
      { id:'offers', title:'Offers', html: `
        <label><input type="checkbox" id="on-sale" ${state.sale?'checked':''}> On sale</label>
        <label><input type="checkbox" id="is-new" ${state.is_new?'checked':''}> New</label>`},
      { id:'rating', title:'Rating', html: `
        <select id="rating-min" class="form-select form-select-sm w-auto">
          <option value="0"${state.rating===0?' selected':''}>Any</option>
          <option value="4"${state.rating===4?' selected':''}>4★ & up</option>
          <option value="3"${state.rating===3?' selected':''}>3★ & up</option>
          <option value="2"${state.rating===2?' selected':''}>2★ & up</option>
        </select>`}
    ];

    function renderInto(root){
      root.innerHTML = groups.map(g=>`
        <section class="c-filter-group" data-group="${g.id}">
          <div class="c-filter-title" role="button" aria-expanded="true">
            <span>${g.title}</span><span>▾</span>
          </div>
          <div class="c-filter-body">${g.html}</div>
        </section>`).join('');
      // wire inputs
      root.querySelectorAll('input[name="brand"]').forEach(cb=>{
        cb.addEventListener('change', ()=>{
          const st = getState();
          const selected = Array.from(root.querySelectorAll('input[name="brand"]:checked')).map(x=>x.value);
          st.brands = selected; st.page = 1; setState(st);
        });
      });
      const minEl = root.querySelector('#min-price');
      const maxEl = root.querySelector('#max-price');
      minEl?.addEventListener('change', ()=>{ const st=getState(); st.min = minEl.value?Number(minEl.value):null; st.page=1; setState(st); });
      maxEl?.addEventListener('change', ()=>{ const st=getState(); st.max = maxEl.value?Number(maxEl.value):null; st.page=1; setState(st); });

      root.querySelector('#in-stock')?.addEventListener('change', (e)=>{ const st=getState(); st.stock = e.target.checked; st.page=1; setState(st); });
      root.querySelector('#on-sale')?.addEventListener('change', (e)=>{ const st=getState(); st.sale = e.target.checked; st.page=1; setState(st); });
      root.querySelector('#is-new')?.addEventListener('change', (e)=>{ const st=getState(); st.is_new = e.target.checked; st.page=1; setState(st); });
      root.querySelector('#rating-min')?.addEventListener('change', (e)=>{ const st=getState(); st.rating = Number(e.target.value); st.page=1; setState(st); });
    }

    const desk = document.getElementById('filters-desktop');
    const mob  = document.getElementById('filters-mobile');
    if(desk) renderInto(desk);
    if(mob)  renderInto(mob);
  }

  function bindSort(){
    const sel = document.getElementById('sort-select');
    if(!sel) return;
    // ensure options
    if(!sel.options.length){
      sel.innerHTML = `
        <option value="featured">Featured</option>
        <option value="price_asc">Price: Low to High</option>
        <option value="price_desc">Price: High to Low</option>
        <option value="name_asc">Name A–Z</option>
        <option value="newest">Newest</option>`;
    }
    sel.className = 'form-select form-select-sm w-auto';
    sel.addEventListener('change', ()=>{ const st=getState(); st.sort = sel.value; st.page=1; setState(st); });
    const label = document.querySelector('label[for="sort-select"]');
    label && label.classList.add('visually-hidden');
  }

  async function render(){
    const state = getState();
    const all = await loadProducts();
    renderFiltersUI(all, state);
    const filtered = applyFilters(all, state);
    const sorted = applySort(filtered, state.sort);
    const { slice, total, pageCount } = paginate(sorted, state.page);
    renderGrid(slice);
    renderCount(total);
    renderPager(state.page, pageCount);
    const live = document.getElementById('product-count'); live && live.focus && live.focus();
  }

  // adjust DOM to match new toolbar layout
  function setupDOM(){
    const toolbar = document.querySelector('.d-flex.justify-content-between.align-items-center.mb-3');
    if(toolbar){ toolbar.className = 'c-toolbar d-flex align-items-center gap-2 mb-3'; }
    const sortWrap = document.getElementById('sort-select')?.parentElement;
    if(sortWrap){ sortWrap.className = 'ms-auto d-flex align-items-center gap-2'; }
    document.getElementById('open-filters')?.removeAttribute('style');
    document.getElementById('sort-select')?.removeAttribute('style');
    document.getElementById('apply-filters-mobile')?.removeAttribute('style');
    document.getElementById('clear-filters-mobile')?.removeAttribute('style');
  }

  document.getElementById('open-filters')?.addEventListener('click', ()=>{
    const el = document.getElementById('filterDrawer');
    if(window.bootstrap?.Offcanvas){ new bootstrap.Offcanvas(el).show(); }
  });
  document.getElementById('apply-filters-mobile')?.addEventListener('click', ()=>{
    const el = document.getElementById('filterDrawer');
    if(window.bootstrap?.Offcanvas){ bootstrap.Offcanvas.getInstance(el)?.hide(); }
  });
  document.getElementById('clear-filters-mobile')?.addEventListener('click', ()=>{
    history.pushState(null,'',location.pathname);
    render();
  });

  window.addEventListener('popstate', render);
  setupDOM();
  bindSort();
  render();
})();
