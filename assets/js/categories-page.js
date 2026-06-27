document.addEventListener('DOMContentLoaded', async () => {
  try {
    const categories = await StorefrontRuntime.loadCategories();
    const top = categories.filter(c => !c.parent)
      .sort((a,b)=>(a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name));
    const container = document.getElementById('all-categories');
    const childrenMap = categories.reduce((acc, c) => {
      if (c.parent) {
        (acc[c.parent] = acc[c.parent] || []).push(c);
      }
      return acc;
    }, {});
    top.forEach(cat => {
      const col = document.createElement('div');
      col.className = 'col-6 col-md-4 col-lg-3 mb-4';
      const card = document.createElement('a');
      card.href = `/c/${cat.slug}/`;
      card.className = 'text-decoration-none text-dark d-block h-100 p-2';
      card.style.minHeight = '44px';
      card.style.minWidth = '44px';
      if (cat.image) {
        const img = document.createElement('img');
        img.src = cat.image;
        img.alt = cat.name;
        img.loading = 'lazy';
        img.width = 300;
        img.height = 300;
        img.className = 'img-fluid mb-2';
        img.style.objectFit = 'cover';
        img.style.aspectRatio = '1/1';
        card.appendChild(img);
      }
      const title = document.createElement('h6');
      title.textContent = cat.name;
      card.appendChild(title);
      const childWrap = document.createElement('div');
      (childrenMap[cat.slug]||[])
        .sort((a,b)=>(a.sortOrder - b.sortOrder)||a.name.localeCompare(b.name))
        .forEach(ch => {
          const chip = document.createElement('a');
          chip.href = `/c/${ch.slug}/`;
          chip.textContent = ch.name;
          chip.className = 'badge bg-light text-dark border me-1';
          chip.style.minHeight = '44px';
          chip.style.display = 'inline-flex';
          chip.style.alignItems = 'center';
          chip.style.padding = '0.25rem 0.5rem';
          childWrap.appendChild(chip);
        });
      card.appendChild(childWrap);
      col.appendChild(card);
      container.appendChild(col);
    });
  } catch (e) {
    console.error(e);
  }
});
