document.addEventListener('DOMContentLoaded', async () => {
  try {
    await StorefrontRuntime.loadProducts();
    const slugs = WishlistCompare.getCompare();
    const prods = slugs.map(StorefrontRuntime.getProductBySlug).filter(Boolean);
    const empty = document.getElementById('compare-empty');
    const wrap = document.getElementById('compare-table-wrapper');
    const table = document.getElementById('compare-table');
    if (!prods.length){
      empty.classList.remove('d-none');
      return;
    }
    wrap.classList.remove('d-none');
    const headers = ['',''];
    const rows = [
      {label:'Image', cells: prods.map(p=>`<img src="${p.images[0]}" alt="${p.name}" width="100" height="100" style="object-fit:cover;aspect-ratio:1/1;">`)},
      {label:'Name', cells: prods.map(p=>`<a href="/p/${p.slug}">${p.name}</a>`)},
      {label:'Price', cells: prods.map(p=>StorefrontRuntime.formatPrice(p.price,p.currency))},
      {label:'Availability', cells: prods.map(p=>p.inStock? 'In stock' : 'Out of stock')},
      {label:'Brand', cells: prods.map(p=>p.brand||'')},
      {label:'Categories', cells: prods.map(p=>(p.categories||[]).map(c=>StorefrontRuntime.findCategoryBySlug(c)?.name).filter(Boolean).join(', '))},
      {label:'Tags', cells: prods.map(p=>(p.tags||[]).join(', '))},
      {label:'Badges', cells: prods.map(p=>StorefrontRuntime.renderProductBadgesHTML(p))}
    ];
    const thead = document.createElement('thead');
    const hrow = document.createElement('tr');
    hrow.appendChild(document.createElement('th'));
    prods.forEach(p=>{
      const th = document.createElement('th');
      th.innerHTML = `${p.name} <button class="btn-close float-end" data-slug="${p.slug}" aria-label="Remove"></button>`;
      hrow.appendChild(th);
    });
    thead.appendChild(hrow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    rows.forEach(r=>{
      const tr = document.createElement('tr');
      const th = document.createElement('th'); th.scope='row'; th.textContent=r.label; tr.appendChild(th);
      r.cells.forEach(html=>{ const td=document.createElement('td'); td.innerHTML=html; tr.appendChild(td); });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    table.addEventListener('click', e=>{
      const btn = e.target.closest('.btn-close');
      if(btn){
        WishlistCompare.toggleCompare(btn.getAttribute('data-slug'));
        location.reload();
      }
    });
    document.getElementById('compare-clear').addEventListener('click', ()=>{WishlistCompare.clearCompare(); location.reload();});
  } catch(e){ console.error(e); }
});

