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

  function renderProductCardHTML(prod) {
    return `<div class="card h-100 position-relative"><button class="btn btn-sm btn-light wishlist-btn position-absolute top-0 end-0 m-2" data-slug="${prod.slug}" aria-pressed="false" aria-label="Add to wishlist"><i class="fa-regular fa-heart"></i></button><a href="/p/${prod.slug}" class="text-decoration-none text-dark" style="display:block;min-width:44px;min-height:44px;"><img src="${prod.images[0]}" class="card-img-top" alt="${prod.name}" loading="lazy" width="300" height="300" style="object-fit:cover;aspect-ratio:1/1;"><div class="card-body p-2"><div class="mb-1">${renderProductBadgesHTML(prod)}</div><h6 class="card-title">${prod.name}</h6><p class="card-text mb-1">${formatPrice(prod.price, prod.currency)}</p></div></a><div class="px-2 pb-2"><div class="form-check"><input class="form-check-input compare-checkbox" type="checkbox" data-slug="${prod.slug}" id="cmp-${prod.slug}"><label class="form-check-label" for="cmp-${prod.slug}">Compare</label></div></div></div>`;
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
    renderProductCardHTML,
    RECENT_KEY
  };
})();
