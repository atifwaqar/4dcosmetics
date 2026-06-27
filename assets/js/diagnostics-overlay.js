(function(){
  let overlay, toggleBtn;
  function update() {
    Promise.all([
      StorefrontRuntime.loadProducts().catch(()=>[]),
      StorefrontRuntime.loadCategories().catch(()=>[])
    ]).then(([products, categories]) => {
      const slug = window.location.pathname.split('/').filter(Boolean)[1] || '';
      const page = StorefrontRuntime.getQueryParam('page') || '1';
      const canonical = document.querySelector('link[rel="canonical"]')?.href || '';
      let breadcrumb = {};
      try { breadcrumb = JSON.parse(document.getElementById('ld-json')?.textContent || '{}'); } catch {}
      const info = {
        products: products.length,
        categories: categories.length,
        route: {slug, page},
        canonical,
        breadcrumb
      };
      const pre = document.getElementById('diagnostics-content');
      if (pre) pre.textContent = JSON.stringify(info, null, 2);
    });
  }
  function show() {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'diagnostics-overlay';
      overlay.setAttribute('data-noindex','');
      overlay.tabIndex = -1;
      overlay.style.cssText = 'position:fixed;bottom:50px;right:10px;background:#fff;border:1px solid #000;padding:8px;max-width:320px;z-index:9999;';
      const pre = document.createElement('pre');
      pre.id = 'diagnostics-content';
      pre.style.margin = '0';
      overlay.appendChild(pre);
      const close = document.createElement('button');
      close.textContent = 'Close';
      close.addEventListener('click', hide);
      overlay.appendChild(close);
      document.body.appendChild(overlay);
    }
    overlay.style.display = 'block';
    update();
    overlay.focus();
  }
  function hide(){ if (overlay) { overlay.style.display = 'none'; toggleBtn.focus(); } }
  function toggle(){ if (overlay && overlay.style.display !== 'none') hide(); else show(); }
  toggleBtn = document.createElement('button');
  toggleBtn.id = 'diagnostics-toggle';
  toggleBtn.textContent = 'Diagnostics';
  toggleBtn.style.cssText = 'position:fixed;bottom:10px;right:10px;z-index:9998;';
  toggleBtn.addEventListener('click', toggle);
  document.body.appendChild(toggleBtn);
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.altKey && e.key === 'd') { e.preventDefault(); toggle(); }
    if (e.key === 'Escape') { hide(); }
  });
  if (new URLSearchParams(window.location.search).get('debug') === '1') { show(); }
})();
