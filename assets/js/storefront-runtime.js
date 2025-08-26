const StorefrontRuntime = (() => {
  let productsCache = null;
  let categoriesCache = null;
  const RECENT_KEY = 'recently_viewed';

  async function loadProducts() {
    if (productsCache) return productsCache;
    const res = await fetch('/assets/data/products.json');
    if (!res.ok) throw new Error('Failed to load products');
    productsCache = await res.json();
    return productsCache;
  }

  async function loadCategories() {
    if (categoriesCache) return categoriesCache;
    const res = await fetch('/assets/data/categories.json');
    if (!res.ok) throw new Error('Failed to load categories');
    categoriesCache = await res.json();
    return categoriesCache;
  }

  function findCategoryBySlug(slug) {
    if (!categoriesCache) return null;
    return categoriesCache.find(c => c.slug === slug) || null;
  }

  function listProductsForCategory(slug) {
    if (!productsCache) return [];
    return productsCache.filter(p => Array.isArray(p.categories) && p.categories.includes(slug));
  }

  function getProductBySlug(slug) {
    if (!productsCache) return null;
    return productsCache.find(p => p.slug === slug) || null;
  }

  function paginateArray(arr, page, perPage) {
    const start = (page - 1) * perPage;
    return arr.slice(start, start + perPage);
  }

  function formatPrice(value, currency) {
    try {
      return new Intl.NumberFormat('en-PK', { style: 'currency', currency: currency || 'PKR' }).format(value);
    } catch (e) {
      return value + ' ' + (currency || '');
    }
  }

  function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function setQueryParam(name, value) {
    const params = new URLSearchParams(window.location.search);
    if (value === null || value === undefined || value === '') {
      params.delete(name);
    } else {
      params.set(name, value);
    }
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }

  const events = {};
  function on(event, cb) {
    (events[event] = events[event] || []).push(cb);
  }
  function emit(event, data) {
    (events[event] || []).forEach(cb => cb(data));
  }

  function getRecentlyViewed() {
    try {
      const arr = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      const list = Array.isArray(arr) ? arr : [];
      if (productsCache) {
        return list.filter(slug => productsCache.some(p => p.slug === slug));
      }
      return list;
    } catch {
      return [];
    }
  }

  function addRecentlyViewed(slug) {
    const list = getRecentlyViewed().filter(s => s !== slug);
    list.unshift(slug);
    if (list.length > 8) list.length = 8;
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(list));
    } catch {}
  }

  function getProductBadges(prod) {
    const badges = [];
    const now = Date.now();
    if (prod.inStock === false) {
      badges.push({label: 'Out of stock', cls: 'bg-secondary'});
    } else if (typeof prod.stockLevel === 'number' && prod.stockLevel > 0 && prod.stockLevel <= 5) {
      badges.push({label: 'Low stock', cls: 'bg-warning text-dark'});
    }
    if (prod.createdAt) {
      const created = Date.parse(prod.createdAt);
      if (!isNaN(created) && (now - created) <= 30*24*60*60*1000) {
        badges.push({label: 'New', cls: 'bg-success'});
      }
    }
    if (Array.isArray(prod.tags) && prod.tags.includes('bestseller')) {
      badges.push({label: 'Bestseller', cls: 'bg-info text-dark'});
    }
    return badges;
  }

  function renderProductBadgesHTML(prod) {
    return getProductBadges(prod).map(b => `<span class="badge ${b.cls} me-1" aria-label="${b.label}">${b.label}</span>`).join('');
  }

  return {
    loadProducts,
    loadCategories,
    findCategoryBySlug,
    listProductsForCategory,
    getProductBySlug,
    paginateArray,
    formatPrice,
    getQueryParam,
    setQueryParam,
    on,
    emit,
    getRecentlyViewed,
    addRecentlyViewed,
    getProductBadges,
    renderProductBadgesHTML,
    RECENT_KEY
  };
})();
