(function(){
  const raw = (document.documentElement?.dataset?.whatsapp || window.__SHOP_WHATSAPP__ || '').replace(/\D/g,'');
  if(!raw) return;
  if(document.querySelector('.mobile-atc')) return;
  const href = `https://wa.me/${raw}`;
  const a = document.createElement('a');
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener';
  a.className = 'wa-fab';
  a.setAttribute('aria-label', 'Chat with us on WhatsApp');
  a.innerHTML = '<svg viewBox="0 0 32 32" width="24" height="24" aria-hidden="true"><path d="M19.11 17.29c-.26-.13-1.53-.75-1.77-.84-.24-.09-.42-.13-.6.13-.18.26-.69.84-.84 1.02-.15.18-.31.2-.57.07s-1.11-.41-2.11-1.3c-.78-.7-1.3-1.56-1.45-1.82-.15-.26-.02-.4.11-.53.11-.11.26-.28.39-.42.13-.15.17-.24.26-.42.09-.18.04-.32-.02-.45-.06-.13-.6-1.45-.82-1.98-.22-.53-.44-.45-.6-.46-.15-.01-.32-.01-.5-.01-.18 0-.45.07-.69.32-.24.26-.9.88-.9 2.15 0 1.27.92 2.5 1.05 2.67.13.18 1.82 2.89 4.41 4.05.62.27 1.1.43 1.47.55.62.2 1.18.17 1.63.1.5-.07 1.53-.62 1.75-1.22.22-.6.22-1.11.15-1.22-.06-.11-.24-.17-.5-.3z" fill="currentColor"/><path d="M16 3c7.18 0 13 5.82 13 13 0 7.17-5.82 13-13 13-2.28 0-4.43-.6-6.29-1.67L3 29l1.71-6.61A12.93 12.93 0 0 1 3 16C3 8.82 8.82 3 16 3zm0 2C9.92 5 5 9.92 5 16c0 2.23.67 4.3 1.82 6.03l-.29 1.12.77-.2c1.67 1.36 3.8 2.18 6.1 2.18 6.08 0 11-4.92 11-11S22.08 5 16 5z" fill="currentColor"/></svg>';
  const style = document.createElement('style');
  style.textContent = '.wa-fab{position:fixed;right:18px;bottom:18px;width:56px;height:56px;border-radius:50%;background:#25D366;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 16px rgba(0,0,0,.2);z-index:60;text-decoration:none;} .wa-fab:hover{filter:brightness(.95);} @media (max-width:640px){.wa-fab{right:14px;bottom:14px;width:52px;height:52px;}}';
  document.head.appendChild(style);
  document.body.appendChild(a);
})();
