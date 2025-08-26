const CACHE_TTL = 120000; // 2 minutes

async function ensureSearchEngine() {
  if (window.SearchEngine) return;
  await new Promise(res => {
    const s = document.createElement('script');
    s.src = '/assets/js/search.js';
    s.onload = res;
    document.head.appendChild(s);
  });
}

function analyticsEvent(type, data = {}) {
  try {
    if (window.gtag) {
      window.gtag('event', type, data);
    } else if (window.dataLayer) {
      window.dataLayer.push({ event: type, ...data });
    }
  } catch (e) {
    console.warn('analytics error', e);
  }
}

function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

function buildProductItem(p, index) {
  const li = document.createElement('div');
  li.className = 'search-option product d-flex align-items-center';
  li.id = `search-option-${index}`;
  li.setAttribute('role', 'option');
  li.setAttribute('data-type', 'product');
  li.setAttribute('data-id', p.id);
  li.setAttribute('data-url', p.url);
  li.innerHTML = `
    <img src="${p.image}" alt="" class="me-2" width="40" height="40" style="object-fit:cover;"/>
    <span class="flex-grow-1 text-truncate">${p.name}</span>
    <span class="ms-2">${StorefrontRuntime.formatPrice(p.price)}</span>
  `;
  return li;
}

function buildCategoryItem(c, index) {
  const li = document.createElement('div');
  li.className = 'search-option category';
  li.id = `search-option-${index}`;
  li.setAttribute('role', 'option');
  li.setAttribute('data-type', 'category');
  li.setAttribute('data-url', c.url);
  li.textContent = `Shop ${c.name} (${c.count})`;
  return li;
}

async function searchAPI(q, limit = 6, signal) {
  await ensureSearchEngine();
  const [productsRaw, categories] = await Promise.all([
    SearchEngine.search(q),
    StorefrontRuntime.loadCategories()
  ]);

  const norm = q.trim().toLowerCase();
  const products = productsRaw.slice(0, limit).map(p => ({
    id: p.id,
    name: p.name,
    url: `/p/${p.slug}`,
    image: Array.isArray(p.images) ? p.images[0] : '',
    price: p.price,
    rating: p.rating || null,
    reviewsCount: p.reviewsCount || null,
    badges: StorefrontRuntime.getProductBadges(p).map(b => b.label)
  }));

  const tokens = norm.split(/\s+/).filter(Boolean);
  const catMatches = categories.filter(c => {
    const n = c.name.toLowerCase();
    return tokens.some(t => n.includes(t));
  }).slice(0, 3).map(c => ({
    name: c.name,
    url: `/c/${c.slug}/`,
    count: StorefrontRuntime.listProductsForCategory(c.slug).length
  }));

  return { products, categories: catMatches, suggestions: [] };
}

function renderEmpty(container, q) {
  const p = document.createElement('div');
  p.className = 'px-2 py-2 text-muted';
  p.textContent = `No results for "${q}".`;
  container.appendChild(p);
  if (liveRegion) liveRegion.textContent = '0 results';
}

let input, results, activeIndex = -1, items = [], abortCtrl = null, liveRegion;
const cache = new Map();

function close() {
  results.innerHTML = '';
  results.classList.add('d-none');
  input.setAttribute('aria-expanded', 'false');
  input.removeAttribute('aria-activedescendant');
  activeIndex = -1;
}

function open() {
  results.classList.remove('d-none');
  input.setAttribute('aria-expanded', 'true');
}

function updateActive() {
  items.forEach((el, i) => {
    if (i === activeIndex) {
      el.classList.add('active');
      input.setAttribute('aria-activedescendant', el.id);
    } else {
      el.classList.remove('active');
    }
  });
  if (activeIndex >= 0 && items[activeIndex]) {
    items[activeIndex].scrollIntoView({ block: 'nearest' });
  }
}

function selectCurrent() {
  if (activeIndex < 0 || !items[activeIndex]) return;
  const el = items[activeIndex];
  const type = el.getAttribute('data-type');
  const url = el.getAttribute('data-url');
  const label = el.textContent.trim();
  analyticsEvent('search_autocomplete_select', {
    type,
    label,
    id: el.getAttribute('data-id') || '',
    position: activeIndex + 1
  });
  window.location.href = url;
}

async function handleInput() {
  const q = input.value.trim();
  if (!q) {
    results.innerHTML = '';
    close();
    if (liveRegion) liveRegion.textContent = '';
    return;
  }
  if (q.length < 2) { close(); return; }
  const norm = q.toLowerCase();
  if (abortCtrl) abortCtrl.abort();
  abortCtrl = new AbortController();
  const cached = cache.get(norm);
  let data;
  if (cached && cached.exp > Date.now()) {
    data = cached.data;
  } else {
    try {
      data = await searchAPI(q, 6, abortCtrl.signal);
      cache.set(norm, { data, exp: Date.now() + CACHE_TTL });
    } catch {
      return;
    }
  }
  renderResults(data, q);
  analyticsEvent('search_suggestion_impression', {
    products: data.products.length,
    categories: data.categories.length
  });
}

function renderResults(data, q) {
  results.innerHTML = '';
  items = [];
  if (!data.products.length && !data.categories.length) {
    renderEmpty(results, q);
    open();
    return;
  }
  if (liveRegion) liveRegion.textContent = `${data.products.length + data.categories.length} results`;
  const frag = document.createDocumentFragment();
  if (data.products.length) {
    const header = document.createElement('div');
    header.className = 'px-2 pt-2 text-muted small';
    header.textContent = 'Products';
    frag.appendChild(header);
    data.products.forEach((p, i) => {
      const el = buildProductItem(p, items.length);
      frag.appendChild(el); items.push(el);
    });
  }
  if (data.categories.length) {
    const header = document.createElement('div');
    header.className = 'px-2 pt-2 text-muted small';
    header.textContent = 'Categories';
    frag.appendChild(header);
    data.categories.forEach(c => {
      const el = buildCategoryItem(c, items.length);
      frag.appendChild(el); items.push(el);
    });
  }
  const footer = document.createElement('div');
  footer.id = `search-option-${items.length}`;
  footer.setAttribute('role', 'option');
  footer.setAttribute('data-type', 'see_all');
  footer.setAttribute('data-url', `/search/?q=${encodeURIComponent(q)}`);
  footer.setAttribute('data-action', 'search-view-all');
  footer.className = 'search-option see-all';
  footer.textContent = `See all results for "${q}"`;
  frag.appendChild(footer); items.push(footer);
  results.appendChild(frag);
  open();
}

function init() {
  input = document.querySelector('[data-component="site-search-input"]') ||
          document.querySelector('.search-form input[type="search"]') ||
          document.querySelector('.bnz-search input[type="search"]');
  if (!input) return;
  if (!input.id) input.id = 'header-search';
  input.setAttribute('data-component', 'site-search-input');
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');

  results = document.createElement('div');
  results.id = 'site-search-results';
  results.setAttribute('data-component', 'site-search-results');
  results.setAttribute('role', 'listbox');
  results.className = 'search-results d-none';
  input.setAttribute('aria-controls', results.id);
  input.parentNode.appendChild(results);

  liveRegion = document.getElementById('search-live-region');
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'search-live-region';
    liveRegion.className = 'visually-hidden';
    liveRegion.setAttribute('aria-live', 'polite');
    document.body.appendChild(liveRegion);
  }

  input.addEventListener('focus', () => { analyticsEvent('search_focus'); });
  input.addEventListener('input', debounce(handleInput, 200));
  input.form && input.form.addEventListener('submit', () => {
    const q = input.value.trim();
    analyticsEvent('search_submit', { query: q });
  });

  input.addEventListener('keydown', e => {
    if (results.classList.contains('d-none')) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (activeIndex < items.length - 1) { activeIndex++; updateActive(); }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (activeIndex > 0) { activeIndex--; updateActive(); }
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0) { e.preventDefault(); selectCurrent(); }
    } else if (e.key === 'Escape') {
      close();
    }
  });

  document.addEventListener('click', e => {
    if (!results.contains(e.target) && e.target !== input) close();
  });

  results.addEventListener('mousedown', e => {
    const opt = e.target.closest('.search-option');
    if (!opt) return;
    activeIndex = items.indexOf(opt);
    selectCurrent();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

