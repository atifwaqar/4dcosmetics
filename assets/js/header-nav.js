document.addEventListener('DOMContentLoaded', async () => {
  try {
    const categories = await StorefrontRuntime.loadCategories();
    const topCats = categories.filter(c => !c.parent)
      .sort((a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name));

    const navList = document.querySelector('.navbar-nav');
    if (navList) {
      const li = document.createElement('li');
      li.className = 'nav-item dropdown';
      li.innerHTML = `<a class="nav-link dropdown-toggle" href="#" id="shopDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">Shop</a><ul class="dropdown-menu" aria-labelledby="shopDropdown"></ul>`;
      const menu = li.querySelector('.dropdown-menu');
      topCats.forEach(cat => {
        const link = document.createElement('a');
        link.className = 'dropdown-item';
        link.href = `/c/${cat.slug}/`;
        link.textContent = cat.name;
        menu.appendChild(link);
      });
      navList.insertBefore(li, navList.firstChild ? navList.children[1] : null);

      if (window.location.pathname.startsWith('/c/')) {
        const slug = window.location.pathname.split('/')[2];
        const active = Array.from(menu.children).find(a => a.getAttribute('href') === `/c/${slug}/`);
        if (active) {
          active.classList.add('active');
          li.querySelector('#shopDropdown').classList.add('active');
        }
      }
    }

    const footerContainer = document.querySelector('footer .container');
    if (footerContainer) {
      const list = document.createElement('div');
      list.className = 'mt-3 footer-categories';
      topCats.forEach(cat => {
        const a = document.createElement('a');
        a.href = `/c/${cat.slug}/`;
        a.textContent = cat.name;
        a.className = 'me-2';
        list.appendChild(a);
      });
      footerContainer.appendChild(list);
    }
  } catch (e) {
    console.error(e);
  }
});
