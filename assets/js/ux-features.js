(function(){
  const WISH_KEY = '4d:wishlist';
  const COMP_KEY = '4d:compare';

  function load(key){
    try{
      const arr = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }

  function save(key, arr){
    try{ localStorage.setItem(key, JSON.stringify(arr)); } catch {}
  }

  function dedupe(arr){
    return Array.from(new Set(arr));
  }

  function getWishlist(){
    let list = load(WISH_KEY);
    if (window.StorefrontRuntime && StorefrontRuntime.getProductBySlug){
      list = list.filter(slug => StorefrontRuntime.getProductBySlug(slug));
    }
    save(WISH_KEY, list);
    return list;
  }

  function toggleWishlist(slug){
    let list = getWishlist().filter(s => s !== slug);
    if (!getWishlist().includes(slug)){
      list.unshift(slug);
      if (list.length > 100) list = list.slice(0,100);
    }
    save(WISH_KEY, list);
    renderButtons();
  }

  function getCompare(){
    let list = load(COMP_KEY);
    if (window.StorefrontRuntime && StorefrontRuntime.getProductBySlug){
      list = list.filter(slug => StorefrontRuntime.getProductBySlug(slug));
    }
    save(COMP_KEY, list);
    return list;
  }

  function toggleCompare(slug){
    let list = getCompare();
    if (list.includes(slug)){
      list = list.filter(s => s !== slug);
    } else {
      if (list.length >= 4){
        showToast('You can compare up to 4 products.');
        return;
      }
      list.push(slug);
    }
    save(COMP_KEY, list);
    renderButtons();
    renderTray();
  }

  function clearCompare(){
    save(COMP_KEY, []);
    renderButtons();
    renderTray();
  }

  function showToast(msg){
    let t = document.getElementById('ux-toast');
    if(!t){
      t = document.createElement('div');
      t.id = 'ux-toast';
      t.className = 'position-fixed bottom-0 start-50 translate-middle-x mb-3 px-3 py-2 bg-dark text-white rounded';
      t.style.zIndex = 1080;
      t.classList.add('d-none');
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.remove('d-none');
    setTimeout(()=>t.classList.add('d-none'),3000);
  }

  function renderButtons(scope){
    const root = scope || document;
    const wishlist = getWishlist();
    root.querySelectorAll('.wishlist-btn').forEach(btn => {
      const slug = btn.getAttribute('data-slug');
      const active = wishlist.includes(slug);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      btn.setAttribute('aria-label', active ? 'Remove from wishlist' : 'Add to wishlist');
      btn.innerHTML = `<i class="${active ? 'fa-solid text-danger' : 'fa-regular'} fa-heart"></i>`;
    });

    const compare = getCompare();
    root.querySelectorAll('.compare-checkbox').forEach(chk => {
      const slug = chk.getAttribute('data-slug');
      chk.checked = compare.includes(slug);
    });
  }

  function renderTray(){
    const list = getCompare().map(slug => StorefrontRuntime.getProductBySlug(slug)).filter(Boolean);
    let tray = document.getElementById('compare-tray');
    if (!list.length){
      if (tray) tray.classList.add('d-none');
      return;
    }
    if(!tray){
      tray = document.createElement('div');
      tray.id = 'compare-tray';
      tray.className = 'position-fixed bottom-0 start-0 end-0 bg-light border-top p-2 d-none';
      tray.innerHTML = `<div class="container d-flex align-items-center"><div id="compare-tray-items" class="d-flex me-auto"></div><button class="btn btn-link me-2" id="compare-clear-all">Clear all</button><a href="/compare/" class="btn btn-primary" id="compare-go">Compare (<span id="compare-count"></span>)</a></div>`;
      document.body.appendChild(tray);
      tray.querySelector('#compare-clear-all').addEventListener('click', clearCompare);
    }
    const items = tray.querySelector('#compare-tray-items');
    items.innerHTML = '';
    list.forEach(p => {
      const wrap = document.createElement('div');
      wrap.className = 'me-2 position-relative';
      const img = document.createElement('img');
      img.src = p.images[0];
      img.width = 40; img.height = 40; img.alt = '';
      img.className = 'rounded';
      wrap.appendChild(img);
      const rm = document.createElement('button');
      rm.className = 'btn-close position-absolute top-0 end-0';
      rm.setAttribute('aria-label','Remove');
      rm.addEventListener('click',()=>toggleCompare(p.slug));
      wrap.appendChild(rm);
      items.appendChild(wrap);
    });
    tray.querySelector('#compare-count').textContent = list.length;
    tray.classList.remove('d-none');
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest('.wishlist-btn');
    if (btn){
      e.preventDefault();
      toggleWishlist(btn.getAttribute('data-slug'));
    }
  });

  document.addEventListener('change', e => {
    const chk = e.target.closest('.compare-checkbox');
    if (chk){
      toggleCompare(chk.getAttribute('data-slug'));
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    renderButtons();
    renderTray();
  });

  window.WishlistCompare = {
    getWishlist, toggleWishlist, getCompare, toggleCompare, clearCompare, renderButtons
  };
})();

