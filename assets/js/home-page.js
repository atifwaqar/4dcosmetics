document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('home-categories');
  if (!container) return;
  try {
    const categories = await StorefrontRuntime.loadCategories();
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
      if (cat.image) {
        const img = document.createElement('img');
        img.src = cat.image;
        img.alt = cat.name;
        img.loading = 'lazy';
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
        view.addEventListener('click', e => {
          e.preventDefault();
          const toggle = document.getElementById('shopDropdown');
          if (toggle) {
            const dd = bootstrap.Dropdown.getOrCreateInstance(toggle);
            dd.show();
            toggle.focus();
          }
        });
      }
    }
  } catch (e) {
    console.error(e);
  }
});
