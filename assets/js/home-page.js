import { buildProductCard, Analytics } from './ui-cards.js';

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('home-categories');
  if (!container) return;
  try {
    const categories = await StorefrontRuntime.loadCategories();
    const products = await StorefrontRuntime.loadProducts();
    const topCats = categories.filter(c => !c.parent)
      .sort((a,b)=>(a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name));
    const limit = 6;
    topCats.slice(0, limit).forEach(cat => {
      const col = document.createElement('div');
      col.className = 'col-6 col-md-4 col-lg-3 mb-4 text-center';
      const link = document.createElement('a');
      link.href = `/c/${cat.slug}/`;
      link.className = 'd-block text-decoration-none text-dark p-2';
      link.style.minHeight = '44px';
      link.style.minWidth = '44px';
      if (cat.image) {
        const img = document.createElement('img');
        img.src = cat.image;
        img.alt = cat.name;
        img.loading = 'lazy';
        img.width = 300;
        img.height = 300;
        img.className = 'img-fluid mb-2';
        img.style.objectFit = 'cover';
        img.style.aspectRatio = '1 / 1';
        link.appendChild(img);
      }
      const span = document.createElement('span');
      span.textContent = cat.name;
      link.appendChild(span);
      col.appendChild(link);
      container.appendChild(col);
    });
    if (topCats.length > limit) {
      const wrap = document.getElementById('view-all-categories-wrapper');
      if (wrap) {
        wrap.classList.remove('d-none');
        const view = document.getElementById('view-all-categories');
        view.href = '/categories/';
      }
    }

    const featured = document.getElementById('featured-products');
    if (featured) {
      const row = document.createElement('div');
      row.className = 'row';
      let items = products.filter(p => (p.tags || []).includes('featured'));
      if (!items.length) items = products.slice(0,4);
      const rendered=[];
      items.slice(0,4).forEach(prod => {
        const card=buildProductCard(prod);
        if(card){ row.appendChild(card); rendered.push(prod);} 
      });
      featured.appendChild(row);
      Analytics.viewItemList(rendered, 'Featured');
    }

    const recentSection = document.getElementById('recently-viewed-home');
    const recentRow = document.getElementById('recently-viewed-home-row');
    const recSlugs = StorefrontRuntime.getRecentlyViewed();
    const prods = recSlugs.map(StorefrontRuntime.getProductBySlug).filter(Boolean);
    if (prods.length >= 3) {
      recentSection.classList.remove('d-none');
      prods.forEach(p => {
        const col=document.createElement('div'); col.className='col-6 col-md-3 mb-4';
        col.innerHTML = `<a href="/p/${p.slug}" class="text-decoration-none text-dark" style="display:block;min-width:44px;min-height:44px;"><div class="card h-100"><img src="${p.images[0]}" class="card-img-top" alt="${p.name}" loading="lazy" width="300" height="300" style="object-fit:cover;aspect-ratio:1/1;"><div class="card-body p-2"><div class="mb-1">${StorefrontRuntime.renderProductBadgesHTML(p)}</div><h6 class="card-title">${p.name}</h6><p class="card-text mb-1">${StorefrontRuntime.formatPrice(p.price, p.currency)}</p></div></div></a>`;
        recentRow.appendChild(col);
      });
    }
  } catch (e) {
    console.error(e);
  }
});
