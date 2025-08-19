document.addEventListener('DOMContentLoaded', async () => {
  try {
    await StorefrontRuntime.loadProducts();
    const slugs = WishlistCompare.getWishlist();
    const products = slugs.map(StorefrontRuntime.getProductBySlug).filter(Boolean);
    const grid = document.getElementById('wishlist-grid');
    if (!products.length){
      document.getElementById('wishlist-empty').classList.remove('d-none');
      return;
    }
    products.forEach(p => {
      const col = document.createElement('div');
      col.className = 'col-6 col-md-3 mb-4';
      col.innerHTML = StorefrontRuntime.renderProductCardHTML(p);
      grid.appendChild(col);
    });
    WishlistCompare.renderButtons();
  } catch (e){
    console.error(e);
  }
});

