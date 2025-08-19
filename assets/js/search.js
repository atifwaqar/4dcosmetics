const SearchEngine = (() => {
  let initialized = false;
  let products = [];
  let categories = [];
  const catMap = {};

  function tokenize(q){
    return q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  }

  async function init(){
    if (initialized) return;
    products = await StorefrontRuntime.loadProducts();
    categories = await StorefrontRuntime.loadCategories();
    categories.forEach(c=>{catMap[c.slug]=c.name.toLowerCase();});
    initialized = true;
  }

  function matchProduct(prod, tokens){
    const name = prod.name.toLowerCase();
    const brand = (prod.brand||'').toLowerCase();
    const tags = (prod.tags||[]).map(t=>t.toLowerCase());
    const cats = (prod.categories||[]).map(slug=>catMap[slug]||slug);
    const short = (prod.shortDescription||'').toLowerCase();
    let score = 0;
    let nameOrBrandMatched = false;
    for(const t of tokens){
      if(name.startsWith(t)){ score+=50; nameOrBrandMatched=true; }
      else if(name.includes(t)){ score+=40; nameOrBrandMatched=true; }
      if(brand.includes(t)){ score+=30; nameOrBrandMatched=true; }
      if(cats.some(c=>c.includes(t)) || tags.some(tag=>tag.includes(t))){ score+=20; }
      if(short.includes(t)) score+=10;
    }
    if(tokens.length>=2 && !nameOrBrandMatched) return 0;
    return score;
  }

  async function search(query){
    await init();
    const tokens = tokenize(query);
    if(!tokens.length) return [];
    const results = [];
    products.forEach(p=>{
      const s = matchProduct(p, tokens);
      if(s>0) results.push({product:p, score:s});
    });
    results.sort((a,b)=>b.score - a.score);
    return results.map(r=>r.product);
  }

  return { search, tokenize };
})();
