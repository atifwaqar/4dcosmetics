(function(){
  const toggle = document.querySelector('.nav-toggle');
  const drawer = document.getElementById('site-drawer');
  if(!toggle || !drawer) return;

  function openDrawer(){
    drawer.hidden = false;
    drawer.classList.add('is-open');
    document.body.classList.add('body-lock');
    toggle.setAttribute('aria-expanded','true');
  }
  function closeDrawer(){
    drawer.classList.remove('is-open');
    document.body.classList.remove('body-lock');
    toggle.setAttribute('aria-expanded','false');
    // hide after animation for a11y
    setTimeout(()=>{ if(!drawer.classList.contains('is-open')) drawer.hidden = true; }, 250);
  }

  toggle.addEventListener('click', ()=>{
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    expanded ? closeDrawer() : openDrawer();
  });

  // close on ESC and backdrop click
  document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closeDrawer(); });
  drawer.addEventListener('click', (e)=>{ if(e.target === drawer) closeDrawer(); });
})();
