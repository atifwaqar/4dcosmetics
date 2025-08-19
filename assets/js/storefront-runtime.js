const StorefrontRuntime = (() => {
  let productsCache = null;
  let categoriesCache = null;

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
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(value);
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
    emit
  };
})();
