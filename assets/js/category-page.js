document.addEventListener('DOMContentLoaded', async () => {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const slug = parts[1];
  const pageNum = parseInt(StorefrontRuntime.getQueryParam('page') || '1', 10);
  const perPage = 12;
  try {
    await StorefrontRuntime.loadCategories();
    await StorefrontRuntime.loadProducts();
    const category = StorefrontRuntime.findCategoryBySlug(slug);
    if (!category) {
      return render404();
    }
      const canonicalUrl = `${window.location.origin}/c/${category.slug}/`;
      document.title = `${category.name} | 4D Cosmetics`;
      document.getElementById('canonical-link').setAttribute('href', canonicalUrl);
      const meta = document.querySelector('meta[name="description"]');
      let metaDesc = '';
      if (meta && category.descriptionHTML) {
        const tmp = document.createElement('div');
        tmp.innerHTML = category.descriptionHTML;
        metaDesc = tmp.textContent.trim().slice(0,160);
        meta.setAttribute('content', metaDesc);
      }
      document.getElementById('og-title').setAttribute('content', `${category.name} | 4D Cosmetics`);
      if (metaDesc) document.getElementById('og-description').setAttribute('content', metaDesc); else document.getElementById('og-description').remove();
      document.getElementById('og-url').setAttribute('content', canonicalUrl);
      if (category.image) {
        document.getElementById('og-image').setAttribute('content', category.image);
      } else {
        document.getElementById('og-image').remove();
      }
      const ld = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {"@type": "ListItem", "position": 1, "name": "Home", "item": `${window.location.origin}/`},
          {"@type": "ListItem", "position": 2, "name": category.name, "item": canonicalUrl}
        ]
      };
      document.getElementById('ld-json').textContent = JSON.stringify(ld);
    document.getElementById('category-title').textContent = category.name;
    if (category.descriptionHTML) {
      document.getElementById('category-description').innerHTML = category.descriptionHTML;
    }
    const breadcrumb = document.getElementById('breadcrumb');
    breadcrumb.innerHTML = `<li class="breadcrumb-item"><a href="/">Home</a></li><li class="breadcrumb-item active" aria-current="page">${category.name}</li>`;

    // sidebar
    const side = document.getElementById('category-sidebar');
    const allCats = await StorefrontRuntime.loadCategories();
    const topCats = allCats.filter(c => !c.parent).sort((a,b)=>(a.sortOrder-b.sortOrder)||a.name.localeCompare(b.name));
    const ul = document.createElement('ul');
    ul.className = 'list-unstyled';
    topCats.forEach(c => {
      const li = document.createElement('li');
      const a = document.createElement('a');
        a.href = `/c/${c.slug}/`;
        a.textContent = c.name;
        if (c.slug === category.slug) {
          a.classList.add('fw-bold');
          a.setAttribute('aria-current', 'page');
        }
      li.appendChild(a);
      ul.appendChild(li);
    });
    side.appendChild(ul);

    const products = StorefrontRuntime.listProductsForCategory(slug);
    const grid = document.getElementById('product-grid');
    if (products.length === 0) {
      const p = document.createElement('p');
      p.textContent = 'No products in this category yet.';
      const link = document.createElement('a');
      link.href = '/';
      link.textContent = 'Browse all categories';
      grid.appendChild(p);
      grid.appendChild(link);
      return;
    }
    const pageItems = StorefrontRuntime.paginateArray(products, pageNum, perPage);
    pageItems.forEach(prod => {
      const col = document.createElement('div');
      col.className = 'col-6 col-md-4 col-lg-3 mb-4';
        col.innerHTML = `<a href="/p/${prod.slug}" class="text-decoration-none text-dark"><div class="card h-100"><img src="${prod.images[0]}" class="card-img-top" alt="${prod.name}" loading="lazy" style="object-fit:cover;aspect-ratio:1/1;"><div class="card-body p-2"><h6 class="card-title">${prod.name}</h6><p class="card-text mb-1">${StorefrontRuntime.formatPrice(prod.price, prod.currency)}</p>${prod.inStock ? '' : '<span class="badge bg-secondary">Out of stock</span>'}</div></div></a>`;
      grid.appendChild(col);
    });
    const totalPages = Math.ceil(products.length / perPage);
    if (totalPages > 1) {
      const nav = document.getElementById('pagination');
      const ulp = document.createElement('ul');
      ulp.className = 'pagination';
        const prev = document.createElement('li');
        const prevA = document.createElement('a');
        prevA.className = 'page-link';
        prevA.textContent = 'Previous';
        if (pageNum === 1) {
          prev.className = 'page-item disabled';
          prevA.setAttribute('aria-disabled', 'true');
          prevA.tabIndex = -1;
        } else {
          prev.className = 'page-item';
          prevA.href = `?page=${pageNum - 1}`;
        }
        prev.appendChild(prevA);
        ulp.appendChild(prev);
      for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement('li');
        li.className = 'page-item' + (i === pageNum ? ' active' : '');
        const a = document.createElement('a');
        a.className = 'page-link';
        a.textContent = i;
        if (i !== pageNum) a.href = `?page=${i}`;
        li.appendChild(a);
        ulp.appendChild(li);
      }
        const next = document.createElement('li');
        const nextA = document.createElement('a');
        nextA.className = 'page-link';
        nextA.textContent = 'Next';
        if (pageNum === totalPages) {
          next.className = 'page-item disabled';
          nextA.setAttribute('aria-disabled', 'true');
          nextA.tabIndex = -1;
        } else {
          next.className = 'page-item';
          nextA.href = `?page=${pageNum + 1}`;
        }
        next.appendChild(nextA);
        ulp.appendChild(next);
        nav.appendChild(ulp);
        const activeLink = nav.querySelector('.active .page-link');
        if (activeLink) activeLink.focus();
      }
      document.getElementById('product-grid').scrollIntoView();
  } catch (e) {
    console.error(e);
    const container = document.querySelector('.container');
    container.innerHTML = `<div class="alert alert-danger">Error loading data. <button class="btn btn-link p-0" onclick="location.reload()">Retry</button></div>`;
  }

  function render404() {
    document.title = 'Category not found | 4D Cosmetics';
    const container = document.querySelector('.container');
    container.innerHTML = '<h1>Category not found</h1><p><a href="/">Home</a></p>';
    StorefrontRuntime.loadCategories().then(cats => {
      const topCats = cats.filter(c => !c.parent);
      const wrap = document.createElement('div');
      topCats.forEach(cat => {
        const a = document.createElement('a');
        a.href = `/c/${cat.slug}/`;
        a.textContent = cat.name;
        a.className = 'me-2';
        wrap.appendChild(a);
      });
      container.appendChild(wrap);
    });
  }
});
