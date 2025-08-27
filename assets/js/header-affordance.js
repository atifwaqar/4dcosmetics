(()=>{
  const root=document.documentElement;
  const update=()=>root.classList.toggle('scrolled', window.scrollY>4);
  window.addEventListener('scroll', update, {passive:true});
  update();
})();