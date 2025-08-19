import { buildProductCard, Analytics } from './ui-cards.js';

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const query = (params.get('q') || '').trim();
  const heading = document.getElementById('search-heading');
  const countEl = document.getElementById('results-count');
  const empty = document.getElementById('search-empty');
  const emptyQuery = document.getElementById('empty-query');
  const emptyLinks = document.getElementById('empty-links');
  const grid = document.getElementById('search-grid');
  const sortSel = document.getElementById('sort');
  const perPage = 12;
  let sort = params.get('sort') || 'featured';
  let page = parseInt(params.get('page') || '1',10);
  if (!query) { heading.textContent = 'Search'; return; }
  heading.textContent = `Search results for "${query}"`;
  sortSel.value = sort;
  await StorefrontRuntime.loadProducts();
  await StorefrontRuntime.loadCategories();
  let results = await SearchEngine.search(query);

  function sortProducts(arr){
    const a=[...arr];
    switch(sort){
      case 'price_asc': return a.sort((x,y)=>x.price-y.price);
      case 'price_desc': return a.sort((x,y)=>y.price-x.price);
      case 'name_asc': return a.sort((x,y)=>x.name.localeCompare(y.name));
      case 'newest': return a.sort((x,y)=>{
        const dx = x.createdAt ? Date.parse(x.createdAt) : x.id;
        const dy = y.createdAt ? Date.parse(y.createdAt) : y.id;
        return dy-dx;
      });
      default: return a;
    }
  }

  function render(){
    let items = sortProducts(results);
    const total = items.length;
    const totalPages = Math.ceil(total/perPage)||1;
    if (page>totalPages) page=totalPages;
    const pageItems = StorefrontRuntime.paginateArray(items,page,perPage);
    grid.innerHTML='';
    if (!pageItems.length){
      empty.classList.remove('d-none');
      emptyQuery.textContent = query;
      countEl.textContent = '0 results';
    } else {
      empty.classList.add('d-none');
      const rendered=[];
      pageItems.forEach(prod => {
        const card = buildProductCard(prod);
        if (card){ grid.appendChild(card); rendered.push(prod); }
      });
      countEl.textContent = `${total} results`;
      Analytics.viewItemList(rendered, 'Search results');
      const ldEl = document.getElementById('ld-json');
      if (ldEl){
        const ld = {
          "@context": "https://schema.org",
          "@type": "ItemList",
          "itemListElement": rendered.map((p,i)=>({"@type":"ListItem","position":i+1,"url":`${window.location.origin}/p/${p.slug}`}))
        };
        ldEl.textContent = JSON.stringify(ld);
      }
    }
    const nav = document.getElementById('pagination'); nav.innerHTML='';
    if (total>perPage){
      const totalPages = Math.ceil(total/perPage);
      const ul=document.createElement('ul'); ul.className='pagination';
      const prev=document.createElement('li'); const prevA=document.createElement('a'); prevA.className='page-link'; prevA.textContent='Previous'; prevA.style.minWidth='44px'; prevA.style.minHeight='44px';
      if (page===1){ prev.className='page-item disabled'; prevA.setAttribute('aria-disabled','true'); prevA.tabIndex=-1; } else { prev.className='page-item'; prevA.href=buildURL({page:page-1}); }
      prev.appendChild(prevA); ul.appendChild(prev);
      for(let i=1;i<=totalPages;i++){ const li=document.createElement('li'); li.className='page-item'+(i===page?' active':''); const a=document.createElement('a'); a.className='page-link'; a.textContent=i; a.style.minWidth='44px'; a.style.minHeight='44px'; if(i!==page) a.href=buildURL({page:i}); li.appendChild(a); ul.appendChild(li); }
      const next=document.createElement('li'); const nextA=document.createElement('a'); nextA.className='page-link'; nextA.textContent='Next'; nextA.style.minWidth='44px'; nextA.style.minHeight='44px';
      if (page===totalPages){ next.className='page-item disabled'; nextA.setAttribute('aria-disabled','true'); nextA.tabIndex=-1; } else { next.className='page-item'; nextA.href=buildURL({page:page+1}); }
      next.appendChild(nextA); ul.appendChild(next); nav.appendChild(ul);
    }
  }

  function buildURL(extra){
    const p=new URLSearchParams();
    p.set('q', query);
    const s=extra.sort||sort; if(s && s!=='featured') p.set('sort', s);
    const pg=extra.page||page; if(pg && pg>1) p.set('page', pg);
    return `?${p.toString()}`;
  }

  sortSel.addEventListener('change', () => {
    sort = sortSel.value; page=1; window.history.replaceState({},'',buildURL({})); render();
  });

  render();

  if (emptyLinks){
    const cats = await StorefrontRuntime.loadCategories();
    const topCats = cats.filter(c=>!c.parent).slice(0,4);
    topCats.forEach(c=>{
      const a=document.createElement('a');
      a.href=`/c/${c.slug}/`;
      a.textContent=c.name;
      a.className='me-2';
      emptyLinks.appendChild(a);
    });
  }
});
