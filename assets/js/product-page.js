document.addEventListener('DOMContentLoaded', async () => {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const slug = parts[1];
  try {
    await StorefrontRuntime.loadProducts();
    await StorefrontRuntime.loadCategories();
    const product = StorefrontRuntime.getProductBySlug(slug);
    if (!product) {
      return render404();
    }
    document.title = `${product.name} | 4D Cosmetics`;
    document.getElementById('canonical-link').setAttribute('href', `/p/${product.slug}`);
    const meta = document.querySelector('meta[name="description"]');
    if (meta && product.shortDescription) {
      meta.setAttribute('content', product.shortDescription.slice(0,160));
    }

    document.getElementById('product-title').textContent = product.name;
    document.getElementById('product-price').textContent = StorefrontRuntime.formatPrice(product.price, product.currency);
    document.getElementById('stock-status').textContent = product.inStock ? 'In stock' : 'Out of stock';
    document.getElementById('short-description').textContent = product.shortDescription || '';
    if (product.descriptionHTML) {
      document.getElementById('details').innerHTML = product.descriptionHTML;
    }

    const breadcrumb = document.getElementById('breadcrumb');
    const firstCatSlug = product.categories && product.categories[0];
    let firstCat = firstCatSlug ? StorefrontRuntime.findCategoryBySlug(firstCatSlug) : null;
    breadcrumb.innerHTML = `<li class="breadcrumb-item"><a href="/">Home</a></li>` + (firstCat ? `<li class="breadcrumb-item"><a href="/c/${firstCat.slug}/">${firstCat.name}</a></li>` : '') + `<li class="breadcrumb-item active" aria-current="page">${product.name}</li>`;

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
    if (document.referrer && document.referrer.includes('/c/')) {
      try {
        const refUrl = new URL(document.referrer);
        backHref = refUrl.pathname;
      } catch {}
    } else if (firstCat) {
      backHref = `/c/${firstCat.slug}/`;
    }
    backLink.href = backHref;

    const mainImg = document.getElementById('main-image');
    const thumbs = document.getElementById('image-thumbs');
    if (product.images && product.images.length) {
      mainImg.src = product.images[0];
      product.images.forEach((img, idx) => {
        const t = document.createElement('img');
        t.src = img;
        t.className = 'img-thumbnail me-2';
        t.style.width = '60px';
        t.style.height = '60px';
        t.style.objectFit = 'cover';
        t.addEventListener('click', () => {
          mainImg.src = img;
        });
        thumbs.appendChild(t);
      });
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
