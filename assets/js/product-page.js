document.addEventListener('DOMContentLoaded', async () => {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const slug = parts[1];
  try {
    const products = await StorefrontRuntime.loadProducts();
    await StorefrontRuntime.loadCategories();
    const product = StorefrontRuntime.getProductBySlug(slug);
    if (!product) {
      return render404();
    }
      const canonicalUrl = `${window.location.origin}/p/${product.slug}`;
      document.title = `${product.name} | 4D Cosmetics`;
      document.getElementById('canonical-link').setAttribute('href', canonicalUrl);
      const meta = document.querySelector('meta[name="description"]');
      let metaDesc = '';
      if (meta && product.shortDescription) {
        metaDesc = product.shortDescription.slice(0,160);
        meta.setAttribute('content', metaDesc);
      } else if (meta) {
        meta.remove();
      }
      document.getElementById('og-title').setAttribute('content', `${product.name} | 4D Cosmetics`);
      if (metaDesc) document.getElementById('og-description').setAttribute('content', metaDesc); else document.getElementById('og-description').remove();
      document.getElementById('og-url').setAttribute('content', canonicalUrl);
      if (product.images && product.images.length) {
        document.getElementById('og-image').setAttribute('content', product.images[0]);
      } else {
        document.getElementById('og-image').remove();
      }

      document.getElementById('product-title').textContent = product.name;
      document.getElementById('product-badges').innerHTML = StorefrontRuntime.renderProductBadgesHTML(product);
      const priceEl = document.getElementById('product-price');
      const stockEl = document.getElementById('stock-status');
      priceEl.textContent = StorefrontRuntime.formatPrice(product.price, product.currency);
      stockEl.textContent = product.inStock ? 'In stock' : 'Out of stock';
      document.getElementById('short-description').textContent = product.shortDescription || '';
      if (product.descriptionHTML) {
        document.getElementById('details').innerHTML = product.descriptionHTML;
      }

      const action = document.getElementById('action-buttons');
      action.innerHTML = `<button class="btn btn-outline-secondary me-2 wishlist-btn" data-slug="${product.slug}" aria-pressed="false" aria-label="Add to wishlist"><i class="fa-regular fa-heart"></i></button><div class="form-check d-inline-block"><input class="form-check-input compare-checkbox" type="checkbox" id="compare-main" data-slug="${product.slug}"><label class="form-check-label" for="compare-main">Compare</label></div>`;
      WishlistCompare.renderButtons(action);

      const breadcrumb = document.getElementById('breadcrumb');
      const firstCatSlug = product.categories && product.categories[0];
      let firstCat = firstCatSlug ? StorefrontRuntime.findCategoryBySlug(firstCatSlug) : null;
      breadcrumb.innerHTML = `<li class="breadcrumb-item"><a href="/">Home</a></li>` + (firstCat ? `<li class="breadcrumb-item"><a href="/c/${firstCat.slug}/">${firstCat.name}</a></li>` : '') + `<li class="breadcrumb-item active" aria-current="page">${product.name}</li>`;
      const ld = [];
      ld.push({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {"@type":"ListItem","position":1,"name":"Home","item":`${window.location.origin}/`},
          ...(firstCat ? [{"@type":"ListItem","position":2,"name":firstCat.name,"item":`${window.location.origin}/c/${firstCat.slug}/`}] : []),
          {"@type":"ListItem","position": firstCat ? 3 : 2, "name": product.name, "item": canonicalUrl}
        ]
      });
      let prodSchema = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": product.name,
        ...(product.images && product.images.length ? {"image": product.images} : {}),
        ...(product.sku ? {"sku": product.sku} : {}),
        "offers": {
          "@type": "Offer",
          "price": product.price,
          "priceCurrency": product.currency,
          "availability": product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
        }
      };
      if (product.brand) prodSchema.brand = {"@type":"Brand","name":product.brand};
      ld.push(prodSchema);
      document.getElementById('ld-json').textContent = JSON.stringify(ld);

    const badges = document.getElementById('category-badges');
    (product.categories || []).forEach(cs => {
      const cat = StorefrontRuntime.findCategoryBySlug(cs);
      if (!cat) return;
      const a = document.createElement('a');
      a.href = `/c/${cat.slug}/`;
      a.className = 'badge bg-light text-dark border me-1';
      a.textContent = cat.name;
      badges.appendChild(a);
    });

    const backLink = document.getElementById('back-link');
    let backHref = '/';
    if (document.referrer) {
      try {
        const refUrl = new URL(document.referrer);
        if (refUrl.origin === window.location.origin && refUrl.pathname.startsWith('/c/')) {
          backHref = refUrl.pathname;
        }
      } catch {}
    } else if (firstCat) {
      backHref = `/c/${firstCat.slug}/`;
    }
    backLink.href = backHref;

      const mainImg = document.getElementById('main-image');
      const thumbs = document.getElementById('image-thumbs');
      const variantWrap = document.getElementById('variant-selector');
      let selectedVariant = null;
      function applyImages(imgs){
        if(!imgs || !imgs.length) return;
        mainImg.src = imgs[0];
        mainImg.alt = product.name;
        mainImg.loading = 'eager';
        thumbs.innerHTML='';
        imgs.forEach(img=>{
          const t=document.createElement('img');
          t.src=img; t.className='img-thumbnail me-2'; t.style.width='60px'; t.style.height='60px'; t.style.objectFit='cover'; t.loading='lazy'; t.alt=product.name; t.addEventListener('click',()=>{mainImg.src=img;});
          thumbs.appendChild(t);
        });
      }
      function updateSwatches(){
        Array.from(variantWrap.querySelectorAll('[role="radio"]')).forEach(btn=>{
          const active = selectedVariant && btn.getAttribute('data-slug')===selectedVariant.slug;
          btn.setAttribute('aria-checked', active?'true':'false');
          btn.classList.toggle('active', active);
        });
      }
      function applyVariant(v){
        selectedVariant = v;
        const imgs = (v && v.images && v.images.length) ? v.images : product.images;
        applyImages(imgs);
        const price = v && v.price != null ? v.price : product.price;
        const inStock = v && v.inStock != null ? v.inStock : product.inStock;
        priceEl.textContent = StorefrontRuntime.formatPrice(price, product.currency);
        stockEl.textContent = inStock ? 'In stock' : 'Out of stock';
        StorefrontRuntime.setQueryParam('v', v ? v.slug : '');
        prodSchema.offers.price = price;
        prodSchema.offers.availability = inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
        document.getElementById('ld-json').textContent = JSON.stringify(ld);
        updateSwatches();
      }
      if (Array.isArray(product.variants) && product.variants.length){
        const sw = document.createElement('div');
        sw.setAttribute('role','radiogroup');
        product.variants.forEach(v=>{
          const btn=document.createElement('button');
          btn.type='button'; btn.className='btn btn-sm btn-outline-secondary me-2 mb-2';
          btn.setAttribute('role','radio');
          btn.setAttribute('data-slug', v.slug);
          btn.setAttribute('aria-checked','false');
          let inner=v.name;
          if(v.swatch){ if(v.swatch.type==='color'){ inner=`<span class="d-block rounded" style="width:20px;height:20px;background:${v.swatch.value};"></span>`; } else if(v.swatch.type==='image'){ inner=`<img src="${v.swatch.value}" alt="" width="20" height="20">`; } else if(v.swatch.type==='text'){ inner=v.swatch.value; } }
          btn.innerHTML=inner;
          btn.addEventListener('click',()=>applyVariant(v));
          btn.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();applyVariant(v);}});
          sw.appendChild(btn);
        });
        variantWrap.appendChild(sw);
        const param = StorefrontRuntime.getQueryParam('v');
        const initial = product.variants.find(v=>v.slug===param) || product.variants[0];
        applyVariant(initial);
      } else {
        applyImages(product.images);
      }

      function renderRelated(prod, recentSet){
        const sec = document.getElementById('related-section');
        const row = document.getElementById('related-products');
        const pinned = (prod.relatedKeys || []).map(id => products.find(p=>p.id===id)).filter(Boolean);
        const pinnedSlugs = new Set(pinned.map(p=>p.slug));
        const others = products.filter(p => p.slug!==prod.slug && !recentSet.has(p.slug) && !pinnedSlugs.has(p.slug));
        others.sort((a,b)=>{
          const brandA = a.brand===prod.brand; const brandB = b.brand===prod.brand;
          const catA = (a.categories||[]).filter(c=>prod.categories.includes(c)).length;
          const catB = (b.categories||[]).filter(c=>prod.categories.includes(c)).length;
          if (brandA && brandB && catA!==catB) return catB-catA;
          if (brandA!==brandB) return brandB-brandA;
          if (catA!==catB) return catB-catA;
          const bestA = (a.tags||[]).includes('bestseller')?1:0;
          const bestB = (b.tags||[]).includes('bestseller')?1:0;
          if (bestA!==bestB) return bestB-bestA;
          const dateA = Date.parse(a.createdAt||0);
          const dateB = Date.parse(b.createdAt||0);
          return dateB-dateA;
        });
        const list = [...pinned, ...others].slice(0,8);
        if (!list.length) return [];
        list.forEach(p=>{ const col=document.createElement('div'); col.className='col-6 col-md-3 mb-4'; col.innerHTML=StorefrontRuntime.renderProductCardHTML(p); row.appendChild(col); });
        sec.classList.remove('d-none');
        WishlistCompare.renderButtons(row);
        return list.map(p=>p.slug);
      }

      function renderRecommended(prod, recentSet, relatedSet){
        const sec = document.getElementById('recommended-section');
        const row = document.getElementById('recommended-products');
        const candidates = products.filter(p => p.slug!==prod.slug && !recentSet.has(p.slug) && !relatedSet.has(p.slug));
        candidates.sort((a,b)=>{
          const tagA = (a.tags||[]).filter(t=> (prod.tags||[]).includes(t)).length;
          const tagB = (b.tags||[]).filter(t=> (prod.tags||[]).includes(t)).length;
          if (tagA!==tagB) return tagB-tagA;
          const catA = (a.categories||[]).filter(c=>prod.categories.includes(c)).length;
          const catB = (b.categories||[]).filter(c=>prod.categories.includes(c)).length;
          return catB-catA;
        });
        const list = candidates.slice(0,8);
        if (list.length < 4) return;
        list.forEach(p=>{ const col=document.createElement('div'); col.className='col-6 col-md-3 mb-4'; col.innerHTML=StorefrontRuntime.renderProductCardHTML(p); row.appendChild(col); });
        sec.classList.remove('d-none');
        WishlistCompare.renderButtons(row);
      }

      StorefrontRuntime.addRecentlyViewed(product.slug);
      const recent = StorefrontRuntime.getRecentlyViewed().filter(s=>s!==product.slug);
      const recentSet = new Set(recent);
      const relatedSlugs = renderRelated(product, recentSet);
      renderRecommended(product, recentSet, new Set(relatedSlugs));
      const prods = recent.map(StorefrontRuntime.getProductBySlug).filter(Boolean);
      if (prods.length >= 4){
        const sec = document.getElementById('recently-viewed-section');
        const row = document.getElementById('recently-viewed');
        prods.forEach(p => {
          const col=document.createElement('div'); col.className='col-6 col-md-3 mb-4';
          col.innerHTML = StorefrontRuntime.renderProductCardHTML(p);
          row.appendChild(col);
        });
        sec.classList.remove('d-none');
        WishlistCompare.renderButtons(row);
      }
  } catch (e) {
    console.error(e);
    const container = document.querySelector('.container');
    container.innerHTML = `<div class="alert alert-danger">Error loading data. <button class="btn btn-link p-0" onclick="location.reload()">Retry</button></div>`;
  }

  function render404() {
    document.title = 'Product not found | 4D Cosmetics';
    const container = document.querySelector('.container');
    container.innerHTML = '<h1>Product not found</h1><p><a href="/">Home</a></p>';
  }
});
