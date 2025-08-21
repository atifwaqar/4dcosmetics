
(function(){
  function renderTabs(activeLabel){
    var root = document.getElementById('home-tabs');
    if(!root) return;
    var cats = [
      {label:'Beauty', href:'/c/makeup/'},
      {label:'Face', href:'/c/makeup/'},
      {label:'Eyes', href:'/c/makeup/'},
      {label:'Lips', href:'/c/makeup/'},
      {label:'Nails', href:'/c/accessories/'},
      {label:'Skin Care', href:'/c/skincare/'}
    ];
    root.innerHTML = cats.map(function(c){
      var isActive = (activeLabel && activeLabel.toLowerCase() === c.label.toLowerCase());
      return '<a class="bnz-tab ' + (isActive ? 'is-active' : '') + '" href="' + c.href + '">' + c.label + '</a>';
    }).join('');
  }
  document.addEventListener('DOMContentLoaded', function(){
    var active = document.body.getAttribute('data-active-tab') || '';
    renderTabs(active);
  });
})();
