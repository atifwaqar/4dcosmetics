
// Home page overlay logic to mirror reference layout
(function(){
  const PAGE_SIZE = 12;
  let all = [];
  let cursor = 0;

  function byTag(tag){ return (all||[]).filter(p => (p.tags||[]).map(s=>String(s).toLowerCase()).includes(tag)); }

  function uniqueSwatches(prod){
    // Try to read possible color hexes from prod.options or tags (hex-like).
    const colors = [];
    if(prod.options && Array.isArray(prod.options.colors)){
      prod.options.colors.forEach(c=>{ if(typeof c === 'string') colors.push(c); });
    }
    // Look for #hex tags in tags array
    (prod.tags||[]).forEach(t=>{
      const m = String(t).match(/#([0-9a-fA-F]{3,6})/);
      if(m){ colors.push('#'+m[1]); }
    });
    // de-dupe and clamp to 6
    return Array.from(new Set(colors)).slice(0,6);
  }

  
function renderTabs(){
  const el = document.getElementById('home-tabs');
  if(!el) return;
  const cats = [
    {label:'Beauty', href:'/c/makeup/'}, 
    {label:'Face', href:'/c/makeup/'}, 
    {label:'Eyes', href:'/c/makeup/'}, 
    {label:'Lips', href:'/c/makeup/'}, 
    {label:'Nails', href:'/c/accessories/'}, 
    {label:'Skin Care', href:'/c/skincare/'}
  ];
  const active = (document.body && document.body.dataset && document.body.dataset.activeTab) ? document.body.dataset.activeTab.trim() : '';
  const html = '<div class="bnz-tabs__rail">' + 
    cats.map(c=> {
      const isActive = (active && active.toLowerCase() === c.label.toLowerCase());
      return `<a class="bnz-tab ${isActive ? 'is-active':''}" href="${c.href}">${c.label}</a>`
    }).join('') +
  '</div>';
  el.innerHTML = html;
}


  function cardHTML(prod){
    // Use ProductCard to keep behavior, then inject swatches row
    const html = window.ProductCard ? ProductCard.renderProductCard(prod) : '';
    const wrap = document.createElement('template');
    wrap.innerHTML = html.trim();
    const el = wrap.content.firstElementChild;
    if(!el) return '';

    // Swatches
    const sw = uniqueSwatches(prod);
    if(sw.length){
      const row = document.createElement('div');
      row.className = 'pc__swatches';
      sw.forEach(c=>{
        const dot = document.createElement('i');
        dot.className = 'pc__swatch';
        dot.style.background = c;
        row.appendChild(dot);
      });
      if((prod.options && prod.options.colors && prod.options.colors.length > sw.length) || (prod.tags||[]).length > sw.length){
        const more = document.createElement('span');
        more.className = 'pc__swatch more';
        more.textContent = '…';
        row.appendChild(more);
      }
      el.querySelector('.pc__body')?.appendChild(row);
    }
    return el.outerHTML;
  }

  function renderMore(){
    const grid = document.getElementById('home-grid');
    if(!grid) return;
    const slice = all.slice(cursor, cursor+PAGE_SIZE);
    grid.insertAdjacentHTML('beforeend', slice.map(cardHTML).join(''));
    cursor += slice.length;
    updateProgress();
    if(cursor >= all.length){
      document.getElementById('load-more')?.setAttribute('disabled','disabled');
    }
  }

  function updateProgress(){
    const prog = document.getElementById('home-progress');
    const viewed = document.getElementById('viewed-count');
    const total = document.getElementById('total-count');
    const bar = document.getElementById('progress-bar');
    if(!prog) return;
    prog.hidden = false;
    viewed.textContent = cursor;
    total.textContent = all.length;
    const pct = all.length ? Math.min(100, Math.round((cursor/all.length)*100)) : 0;
    bar.style.width = pct + '%';
  }

  async function init(){
    renderTabs();
    // Get products from your runtime (fallback to global)
    const src = (window.Storefront && Storefront.getAllProducts) ? await Storefront.getAllProducts() : (window.__ALL_PRODUCTS__ || []);
    all = src.slice(0);
    // Prefer featured tag first to mimic curated grid
    const featured = all.filter(p => (p.tags||[]).includes('featured'));
    const rest = all.filter(p => !(p.tags||[]).includes('featured'));
    all = [...featured, ...rest];
    // Start render
    renderMore();
    document.getElementById('load-more')?.addEventListener('click', renderMore);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
