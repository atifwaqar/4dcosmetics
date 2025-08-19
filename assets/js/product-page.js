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
      const prodSchema = {
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
      if (product.images && product.images.length) {
        mainImg.src = product.images[0];
        mainImg.alt = product.name;
        mainImg.loading = 'eager';
        product.images.forEach((img) => {
          const t = document.createElement('img');
          t.src = img;
          t.className = 'img-thumbnail me-2';
          t.style.width = '60px';
          t.style.height = '60px';
          t.style.objectFit = 'cover';
          t.loading = 'lazy';
          t.alt = product.name;
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
