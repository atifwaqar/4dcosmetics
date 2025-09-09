import { buildProductCard, Analytics } from './ui-cards.js';

document.addEventListener('DOMContentLoaded', async () => {
  const heroSecondary = document.getElementById('hero-secondary-cta');
  heroSecondary?.addEventListener('click', () => Analytics.heroClick('secondary'));

  const newsletterForm = document.getElementById('newsletter-form');
  const newsletterSuccess = document.getElementById('newsletter-success');
  newsletterForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    Analytics.newsletterSignup();
    newsletterSuccess?.classList.remove('d-none');
    newsletterForm.reset();
  });

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
      link.addEventListener('click', () => Analytics.categoryClick(cat));
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
      row.className = 'product-grid';
      let items = products.filter(p => (p.tags || []).includes('featured'));
      if (!items.length) items = products.slice(0,8);
      const rendered=[];
      items.slice(0,8).forEach(prod => {
        const card=buildProductCard(prod);
        if(card){ row.appendChild(card); rendered.push(prod);}
      });
      featured.appendChild(row);
      if(rendered.length){
        const ld={
          "@context":"https://schema.org",
          "@type":"ItemList",
          itemListElement: rendered.map((p,idx)=>({
            "@type":"ListItem",
            position: idx+1,
            url: `${location.origin}/p/${p.slug}`
          }))
        };
        const ldScript=document.createElement('script');
        ldScript.type='application/ld+json';
        ldScript.textContent=JSON.stringify(ld);
        document.head.appendChild(ldScript);
      }
      const observer=new IntersectionObserver(entries=>{
        entries.forEach(entry=>{
          if(entry.isIntersecting){
            Analytics.viewItemList(rendered,'Featured');
            observer.disconnect();
          }
        });
      },{threshold:0.1});
      observer.observe(featured);
    }
  } catch (e) {
    console.error(e);
  }
});
