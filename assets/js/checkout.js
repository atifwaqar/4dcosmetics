import { Payments, fmt, toPKR } from './payments.js';

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
    const notes = document.getElementById('checkout-notes');
    let ord = order;
    if(order.currency !== 'PKR'){
      ord = toPKR(order, this.config.pkConversionRate);
      if(notes) notes.textContent = `Charged in PKR at 1 USD = ${this.config.pkConversionRate} PKR (est.).`;
    } else if(notes){ notes.textContent = ''; }

    const returnUrls = {
      successUrl: `${this.config.returnUrls.success}?oid=${encodeURIComponent(ord.id)}&pm=${method}`,
      cancelUrl: `${this.config.returnUrls.cancel}?cancel=1&pm=${method}`
    };

    try{
      const res = await adapter.start(ord, providerCfg, returnUrls);
      localStorage.setItem('4d-last-order', JSON.stringify(ord));
      if(res.redirectUrl){
        window.location = res.redirectUrl;
      } else if(res.action && res.fields){
        const f = document.createElement('form');
        f.method='POST'; f.action = res.action;
        Object.entries(res.fields).forEach(([k,v])=>{ const i=document.createElement('input'); i.type='hidden'; i.name=k; i.value=v; f.appendChild(i); });
        document.body.appendChild(f); f.submit();
      } else if(res.mailto){
        window.location = res.mailto;
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
