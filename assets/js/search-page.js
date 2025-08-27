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
  const loadMoreBtn = document.getElementById('load-more');
  // load-more container may not have an explicit id in markup
  const loadMoreContainer = document.getElementById('load-more-container') || loadMoreBtn.parentElement;
  let sort = params.get('sort') || 'featured';
  let page = parseInt(params.get('page') || '1',10);
  let currentItems = [];
  let loadedPage = 0;
  let totalPages = 1;
  const ldEl = document.getElementById('ld-json');
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
    grid.innerHTML='';
    loadedPage = 0;
    currentItems = sortProducts(results);
    const total = currentItems.length;
    totalPages = Math.ceil(total/perPage)||1;
    if (page>totalPages) page=totalPages;
    if (!total){
      empty.classList.remove('d-none');
      emptyQuery.textContent = query;
      countEl.textContent = '0 results';
      updateLoadMore();
      return;
    }
    empty.classList.add('d-none');
    countEl.textContent = `${total} results`;
    while (loadedPage < page) {
      appendNextPage();
    }
    updateLoadMore();
  }

  function appendNextPage(){
    const start = loadedPage * perPage;
    const pageItems = currentItems.slice(start, start + perPage);
    if (!pageItems.length) return;
    const rendered = [];
    pageItems.forEach(prod => {
      const card = buildProductCard(prod);
      if (card){ grid.appendChild(card); rendered.push(prod); }
    });
    loadedPage++;
    Analytics.viewItemList(rendered, 'Search results');
    updateLD();
    if (window.__updateSearchProgress){
      const viewed = Math.min(loadedPage * perPage, currentItems.length);
      window.__updateSearchProgress(viewed, currentItems.length);
    }
  }

  function updateLoadMore(){
    if (loadedPage >= totalPages){
      loadMoreContainer.classList.add('d-none');
    } else {
      loadMoreContainer.classList.remove('d-none');
    }
  }

  function updateLD(){
    if (!ldEl) return;
    const shown = currentItems.slice(0, loadedPage * perPage);
    const ld = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "itemListElement": shown.map((p,i)=>({"@type":"ListItem","position":i+1,"url":`${window.location.origin}/p/${p.slug}`}))
    };
    ldEl.textContent = JSON.stringify(ld);
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

  loadMoreBtn.addEventListener('click', () => {
    if (loadedPage < totalPages) {
      page = loadedPage + 1;
      window.history.replaceState({}, '', buildURL({page}));
      appendNextPage();
      updateLoadMore();
      Analytics.loadMoreClick('Search results');
    }
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
