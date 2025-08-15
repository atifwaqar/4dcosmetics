export const Payments = {
  hblpay: {
    needsServer: true,
    async start(order, cfg, returnUrls){
      const res = await fetch(cfg.serverless.createUrl, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ order, returnUrls })
      });
      return await res.json();
      /*
      // Example:
      // app.post('/hblpay/create-session',(req,res)=>{
      //   const { order, returnUrls } = req.body;
      //   // sign request with HBLPay credentials
      //   res.json({ redirectUrl: 'https://hblpay.com/checkout/...' });
      // });
      */
    }
  },
  easypaisa: {
    needsServer:true,
    formPost:true,
    async start(order,cfg, returnUrls){
      const res = await fetch(cfg.serverless.createUrl,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ order, returnUrls })
      });
      return await res.json();
      // Sample serverless:
      // app.post('/easypaisa/create-session',(req,res)=>{
      //   const { order, returnUrls } = req.body;
      //   // compute merchantHashedReq with secret key and return signed fields
      //   res.json({ action: cfg.endpoint, fields: { /* signed fields */ } });
      // });
    }
  },
  jazzcash: {
    needsServer:true,
    formPost:true,
    async start(order,cfg, returnUrls){
      const res = await fetch(cfg.serverless.createUrl,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ order, returnUrls })
      });
      return await res.json();
      /*
      // serverless example for JazzCash signing
      */
    }
  },
  payfast: {
    needsServer:true,
    formPost:true,
    async start(order,cfg, returnUrls){
      const res = await fetch(cfg.serverless.createUrl,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ order, returnUrls })
      });
      return await res.json();
      /*
      // serverless example for PayFast signature
      */
    }
  },
  paypro: {
    needsServer:true,
    async start(order,cfg, returnUrls){
      const res = await fetch(cfg.serverless.createUrl,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ order, returnUrls })
      });
      return await res.json();
      /* sample: create invoice and return {redirectUrl} */
    }
  },
  bsecure: {
    needsServer:true,
    async start(order,cfg, returnUrls){
      const res = await fetch(cfg.serverless.createUrl,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ order, returnUrls })
      });
      return await res.json();
    }
  },
  nift: {
    needsServer:true,
    async start(order,cfg, returnUrls){
      const res = await fetch(cfg.serverless.createUrl,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ order, returnUrls })
      });
      return await res.json();
    }
  },
  bank: {
    needsServer:false,
    async start(order, cfg){
      const body = `\nORDER REQUEST (Bank Transfer)\nOrder: ${order.id}\nAmount: ${fmt(order.amount, order.currency)}\nItems:\n${order.items.map(i=>`• ${i.name} × ${i.qty} = ${fmt(i.subtotal, order.currency)}`).join('\n')}\n---\nBank details:\n${cfg.account.title}\n${cfg.account.bank} – ${cfg.account.branch}\nIBAN: ${cfg.account.iban}\nAccount#: ${cfg.account.accountNo}\n\nReply with transfer receipt to complete your order.`;
      const mailto = `mailto:${cfg.mailto}?subject=${encodeURIComponent('Bank Transfer - '+order.id)}&body=${encodeURIComponent(body)}`;
      return { mailto };
    }
  },
  cod: {
    needsServer:false,
    async start(order, cfg){
      const body = `\nCOD REQUEST\nOrder: ${order.id}\nAmount to collect on delivery: ${fmt(order.amount, order.currency)}\nBuyer: ${safeBuyer(order.buyer)}\nItems:\n${order.items.map(i=>`• ${i.name} × ${i.qty}`).join('\n')}\nAddress: ${order.buyer?.address || '—'}\nPhone: ${order.buyer?.phone || '—'}\n`;
      const mailto = `mailto:${cfg.mailto}?subject=${encodeURIComponent('COD - '+order.id)}&body=${encodeURIComponent(body)}`;
      return { mailto };
    }
  }
};

export function fmt(n, ccy){
  return new Intl.NumberFormat('en-US', {style:'currency', currency: ccy}).format(n);
}

function safeBuyer(b){
  if(!b) return '—';
  const parts = [];
  if(b.name) parts.push(b.name);
  if(b.email) parts.push(b.email);
  return parts.join(' / ') || '—';
}

export function toPKR(order, rate){
  const cloned = JSON.parse(JSON.stringify(order));
  cloned.fx = { base: order.currency, target: 'PKR', rate: rate, baseAmount: order.amount };
  const convert = (n)=> Math.round(n * rate * 100)/100;
  cloned.currency = 'PKR';
  cloned.amount = convert(order.amount);
  cloned.subtotal = convert(order.subtotal);
  cloned.discount = convert(order.discount);
  cloned.shipping = convert(order.shipping);
  cloned.tax = convert(order.tax);
  cloned.items = order.items.map(i=>({ ...i, unit: convert(i.unit), subtotal: convert(i.subtotal) }));
  return cloned;
}
