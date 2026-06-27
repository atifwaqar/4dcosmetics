import { Payments } from './payments.js';

function cacheOrder(order){
  localStorage.setItem('4d-last-order', JSON.stringify(order));
  try{
    const all = JSON.parse(localStorage.getItem('4d-orders') || '[]');
    all.push(order);
    localStorage.setItem('4d-orders', JSON.stringify(all));
  }catch(_){/* noop */}
}

const Checkout = {
  config: null,
  async init(){
    this.config = await fetch('/payments-config.json').then(r=>r.json()).catch(()=>null);
    const url = new URL(window.location);
    if (url.searchParams.get('cancel') === '1'){
      const fb = document.getElementById('pm-feedback');
      if (fb) fb.textContent = 'Payment was canceled. You can try another method.';
    }
  },
  async start(order, method){
    order.currency = 'PKR';
    if(!this.config) await this.init();
    const providerCfg = this.config && this.config.providers[method];
    const fb = document.getElementById('pm-feedback');
    if(!providerCfg){
      if(fb) fb.textContent = 'This method isn\u2019t configured.';
      return;
    }
    const adapter = Payments[method];
    if(!adapter){
      if(fb) fb.textContent = 'This method isn\u2019t configured.';
      return;
    }

    const returnUrls = {
      successUrl: `${this.config.returnUrls.success}?oid=${encodeURIComponent(order.id)}&pm=${method}`,
      cancelUrl: `${this.config.returnUrls.cancel}?cancel=1&pm=${method}`
    };

    try{
      const res = await adapter.start(order, providerCfg, returnUrls);
      if(method === 'whatsappCod' && res.redirectUrl){
        order.id = order.id || (`ORD-${Date.now()}`);
        cacheOrder(order);
        const redirectUrl = res.redirectUrl;
        window.open(redirectUrl, '_blank');
        const success = (returnUrls?.success) || `/thank-you.html?oid=${encodeURIComponent(order.id)}&pm=whatsappCod`;
        window.location.href = success;
      } else {
        order.id = order.id || (`ORD-${Date.now()}`);
        cacheOrder(order);
        if(res.redirectUrl){
          const successUrl = (this.config && this.config.returnUrls && this.config.returnUrls.success)
            ? `${this.config.returnUrls.success}?oid=${encodeURIComponent(order.id)}`
            : `/thank-you.html?oid=${encodeURIComponent(order.id)}`;
          window.open(res.redirectUrl, '_blank');
          window.location.href = successUrl;
        } else if(res.action && res.fields){
          const f = document.createElement('form');
          f.method='POST'; f.action = res.action;
          Object.entries(res.fields).forEach(([k,v])=>{ const i=document.createElement('input'); i.type='hidden'; i.name=k; i.value=v; f.appendChild(i); });
          document.body.appendChild(f); f.submit();
        } else if(res.mailto){
          window.location = res.mailto;
        }
      }
    }catch(e){
      console.error(e);
      if(fb) fb.textContent = 'Checkout failed. Please try again.';
    }
  }
};

Checkout.init();
window.Checkout = Checkout;
export default Checkout;
