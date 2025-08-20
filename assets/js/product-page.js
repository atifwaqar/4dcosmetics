import { normalizePrice, showAddedToast, Analytics } from './ui-cards.js';

document.addEventListener('DOMContentLoaded', async () => {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const slug = parts[1];
  try {
    await StorefrontRuntime.loadProducts();
    await StorefrontRuntime.loadCategories();
    const product = StorefrontRuntime.getProductBySlug(slug);
    if (!product) return render404();
    const canonicalUrl = `${window.location.origin}/p/${product.slug}`;
    document.title = `${product.name} | 4D Cosmetics`;
    document.getElementById('canonical-link').setAttribute('href', canonicalUrl);
    const meta = document.querySelector('meta[name="description"]');
    let metaDesc = '';
    if (meta && product.shortDescription) {
      metaDesc = product.shortDescription.slice(0,160);
      meta.setAttribute('content', metaDesc);
    } else if (meta) { meta.remove(); }
    document.getElementById('og-title').setAttribute('content', `${product.name} | 4D Cosmetics`);
    if (metaDesc) document.getElementById('og-description').setAttribute('content', metaDesc); else document.getElementById('og-description').remove();
    document.getElementById('og-url').setAttribute('content', canonicalUrl);
    if (product.images && product.images.length) document.getElementById('og-image').setAttribute('content', product.images[0]); else document.getElementById('og-image').remove();

    document.getElementById('product-title').textContent = product.name;
    document.getElementById('product-badges').innerHTML = StorefrontRuntime.renderProductBadgesHTML(product);
    const priceEl = document.getElementById('product-price');
    const addBtn = document.querySelector('.item_add');
    const currency = product.currency || 'USD';
    const stockEl = document.getElementById('stock-status');
    const variantWrap = document.getElementById('variant-options');
    const idEl = document.getElementById('product-id');
    const mainImg = document.getElementById('main-image');
    const liveRegion = document.getElementById('live-region');
    let currentVariant = null;

    if (Array.isArray(product.variants) && product.variants.length) {
      const param = StorefrontRuntime.getQueryParam('variant');
      currentVariant = product.variants.find(v => v.id === param) || product.variants[0];
      variantWrap.setAttribute('role', 'radiogroup');
      product.variants.forEach(v => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'variant-swatch me-2 mb-2';
        if (v.color) btn.style.backgroundColor = v.color;
        btn.title = v.name;
        btn.setAttribute('aria-label', `Shade: ${v.name}`);
        btn.dataset.variant = v.id;
        btn.disabled = v.inStock === false;
        btn.addEventListener('click', () => { applyVariant(v); updateSwatches(); });
        variantWrap.appendChild(btn);
      });
    }

    function applyVariant(v){
      currentVariant = v;
      const priceNum = normalizePrice(v && v.price !== undefined ? v.price : product.price);
      if (priceNum !== null) {
        priceEl.innerHTML = `<span class="visually-hidden item_price">${priceNum}</span><span aria-hidden="true" class="price-ui">${StorefrontRuntime.formatPrice(priceNum, currency)}</span>`;
        addBtn.disabled = v && v.inStock === false;
        addBtn.textContent = v && v.inStock === false ? 'Notify me' : 'Add to Cart';
      } else {
        priceEl.innerHTML = `<span class="visually-hidden item_price"></span><span aria-hidden="true" class="price-ui">Unavailable</span>`;
        addBtn.disabled = true;
        addBtn.textContent = 'Unavailable';
      }
      stockEl.textContent = v && v.inStock === false ? 'Out of stock' : 'In stock';
      if (idEl) idEl.textContent = v ? v.id : product.id || product.slug;
      if (v && v.image) { mainImg.src = v.image; mainImg.alt = `${product.name} - ${v.name}`; }
      StorefrontRuntime.setQueryParam('variant', v ? v.id : null);
      const mobileInfo = document.getElementById('mobile-atc-info');
      if (mobileInfo) mobileInfo.textContent = `${v ? v.name : product.name} • ${StorefrontRuntime.formatPrice(normalizePrice(v && v.price !== undefined ? v.price : product.price), currency)}`;
      if (liveRegion) liveRegion.textContent = `${v ? v.name : ''} selected`;
    }

    function updateSwatches(){
      variantWrap.querySelectorAll('.variant-swatch').forEach(btn => {
        const sel = currentVariant && btn.dataset.variant === currentVariant.id;
        btn.classList.toggle('selected', sel);
        btn.setAttribute('aria-pressed', sel ? 'true' : 'false');
      });
    }

    document.getElementById('short-description').textContent = product.shortDescription || '';
    if (Array.isArray(product.details) && product.details.length) {
      document.getElementById('details').innerHTML = '<ul>' + product.details.map(d=>`<li>${d}</li>`).join('') + '</ul>';
    } else if (product.descriptionHTML) document.getElementById('details').innerHTML = product.descriptionHTML;
    if (Array.isArray(product.howTo) && product.howTo.length) document.getElementById('how-to').innerHTML = '<ol>' + product.howTo.map(d=>`<li>${d}</li>`).join('') + '</ol>';
    if (product.ingredients) document.getElementById('ingredients').textContent = product.ingredients;
    if (product.goodToKnow) document.getElementById('good-to-know').textContent = product.goodToKnow;
    if (product.shippingReturns) document.getElementById('shipping-returns').textContent = product.shippingReturns;
    ['details','how-to','ingredients','good-to-know','shipping-returns'].forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.textContent.trim()) el.parentElement.remove();
    });

    const breadcrumb = document.getElementById('breadcrumb');
    const firstCatSlug = product.categories && product.categories[0];
    let firstCat = firstCatSlug ? StorefrontRuntime.findCategoryBySlug(firstCatSlug) : null;
    breadcrumb.innerHTML = `<li class="breadcrumb-item"><a href="/">Home</a></li>` + (firstCat ? `<li class="breadcrumb-item"><a href="/c/${firstCat.slug}/">${firstCat.name}</a></li>` : '') + `<li class="breadcrumb-item active" aria-current="page">${product.name}</li>`;
    const ld = [{
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {"@type":"ListItem","position":1,"name":"Home","item":`${window.location.origin}/`},
        ...(firstCat ? [{"@type":"ListItem","position":2,"name":firstCat.name,"item":`${window.location.origin}/c/${firstCat.slug}/`}] : []),
        {"@type":"ListItem","position": firstCat ? 3 : 2, "name": product.name, "item": canonicalUrl}
      ]
    },{
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.name,
      ...(product.images && product.images.length ? {"image": product.images} : {}),
      ...(product.sku ? {"sku": product.sku} : {}),
      "offers": {
        "@type": "Offer",
        "price": priceNum !== null ? priceNum : undefined,
        "priceCurrency": product.currency,
        "availability": product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
      },
      ...(product.brand ? {"brand": {"@type":"Brand","name":product.brand}} : {})
    }];
    document.getElementById('ld-json').textContent = JSON.stringify(ld);

    const urlEl = document.getElementById('product-url');
    if (urlEl) urlEl.href = canonicalUrl;

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
        if (refUrl.origin === window.location.origin && refUrl.pathname.startsWith('/c/')) backHref = refUrl.pathname;
      } catch {}
    } else if (firstCat) backHref = `/c/${firstCat.slug}/`;
    backLink.href = backHref;

    const mainImg = document.getElementById('main-image');
    mainImg.classList.add('item_image', 'item_thumb');
    const thumbs = document.getElementById('image-thumbs');
    if (product.images && product.images.length) {
      if (!currentVariant || !currentVariant.image) {
        mainImg.src = product.images[0];
        mainImg.alt = product.name;
      }
      mainImg.loading = 'eager';
      mainImg.decoding = 'async';
      mainImg.onerror = function(){ this.src='/assets/img/products/fallback.png'; };
      product.images.forEach((img) => {
        const t = document.createElement('img');
        t.src = img;
        t.className = 'img-thumbnail me-2';
        t.style.width = '60px';
        t.style.height = '60px';
        t.style.objectFit = 'cover';
        t.loading = 'lazy';
        t.alt = product.name;
        t.addEventListener('click', () => { mainImg.src = img; });
        thumbs.appendChild(t);
      });
    } else {
      mainImg.src = '/assets/img/products/fallback.png';
      mainImg.alt = product.name || '';
    }
    if (currentVariant) applyVariant(currentVariant);

    const qtyEl = document.getElementById('product-qty');
    if (addBtn) {
      addBtn.setAttribute('aria-label', `Add ${product.name} to cart`);
      addBtn.addEventListener('click', () => {
        const qty = parseInt(qtyEl.value,10) || 1;
        const item = currentVariant ? {...product, ...currentVariant} : product;
        Analytics.addToCart(item, qty);
        if (liveRegion) liveRegion.textContent = 'Added to cart';
        showAddedToast(item.name);
      });
    }
    const mobileBtn = document.getElementById('mobile-atc-btn');
    if (mobileBtn) mobileBtn.addEventListener('click', () => addBtn.click());

    const summary = document.getElementById('summary');
    const mobileBar = document.getElementById('mobile-atc-bar');
    if (summary && mobileBar) {
      const io = new IntersectionObserver(([entry]) => {
        mobileBar.hidden = entry.isIntersecting;
      });
      io.observe(summary);
    }

    StorefrontRuntime.addRecentlyViewed(product.slug);
    const recent = StorefrontRuntime.getRecentlyViewed().filter(s=>s!==product.slug);
    const prods = recent.map(StorefrontRuntime.getProductBySlug).filter(Boolean);
    if (prods.length >= 4){
      const sec = document.getElementById('recently-viewed-section');
      const row = document.getElementById('recently-viewed');
      prods.forEach(p => {
        const col=document.createElement('div'); col.className='col-6 col-md-3 mb-4';
        col.innerHTML = `<a href="/p/${p.slug}" class="text-decoration-none text-dark" style="display:block;min-width:44px;min-height:44px;"><div class="card h-100"><img src="${p.images[0]}" class="card-img-top" alt="${p.name}" loading="lazy" width="300" height="300" style="object-fit:cover;aspect-ratio:1/1;"><div class="card-body p-2"><div class="mb-1">${StorefrontRuntime.renderProductBadgesHTML(p)}</div><h6 class="card-title">${p.name}</h6><p class="card-text mb-1">${StorefrontRuntime.formatPrice(p.price, p.currency)}</p></div></div></a>`;
        row.appendChild(col);
      });
      sec.classList.remove('d-none');
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

