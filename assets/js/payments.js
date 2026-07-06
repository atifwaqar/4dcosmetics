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
      const body = `\nORDER REQUEST (Bank Transfer)\nOrder: ${order.id}\nAmount: ${fmt(order.amount)}\nItems:\n${order.items.map(i=>`• ${i.name} × ${i.quantity ?? i.qty ?? 1} = ${fmt(i.subtotal)}`).join('\n')}\n---\nBank details:\n${cfg.account.title}\n${cfg.account.bank} – ${cfg.account.branch}\nIBAN: ${cfg.account.iban}\nAccount#: ${cfg.account.accountNo}\n\nReply with transfer receipt to complete your order.`;
      const mailto = `mailto:${cfg.mailto}?subject=${encodeURIComponent('Bank Transfer - '+order.id)}&body=${encodeURIComponent(body)}`;
      return { mailto };
    }
  },
  cod: {
    needsServer:false,
    async start(order, cfg){
      const body = `\nCOD REQUEST\nOrder: ${order.id}\nAmount to collect on delivery: ${fmt(order.amount)}\nBuyer: ${safeBuyer(order.buyer)}\nItems:\n${order.items.map(i=>`• ${i.name} × ${i.quantity ?? i.qty ?? 1}`).join('\n')}\nAddress: ${order.buyer?.address || '—'}\nPhone: ${order.buyer?.phone || '—'}\n`;
      const mailto = `mailto:${cfg.mailto}?subject=${encodeURIComponent('COD - '+order.id)}&body=${encodeURIComponent(body)}`;
      return { mailto };
    }
  },
  whatsappCod: {
    needsServer:false,
    async start(order){
      const raw = (document.documentElement?.dataset?.whatsapp || window.__SHOP_WHATSAPP__ || '').replace(/\D/g,'');
      const formatTotal = (n)=> moneyPKR(n);
      const lines = [];
      lines.push('New COD Order');
      if(order.buyer){
        lines.push('');
        if(order.buyer.name) lines.push(`Name: ${order.buyer.name}`);
        if(order.buyer.phone) lines.push(`Phone: ${order.buyer.phone}`);
        if(order.buyer.address) lines.push(`Address: ${order.buyer.address}`);
        if(order.buyer.city) lines.push(`City: ${order.buyer.city}`);
      }
      lines.push('');
      if(order.id) lines.push(`Order ID: ${order.id}`);
      lines.push(`Subtotal: ${formatTotal(order.subtotal)}`);
      if(order.shipping) lines.push(`Shipping: ${formatTotal(order.shipping)}`);
      lines.push(`Total: ${formatTotal(order.amount)}`);
      lines.push('');
      lines.push('Items:');
      lines.push(order.items.map(i=>{
        const qty = i.qty || i.quantity || 1;
        const title = i.name || i.title;
        const price = formatTotal(i.subtotal || (i.unit * qty) || i.unit || 0);
        return `• ${title} × ${qty} — ${price}`;
      }).join('\n'));
      const message = lines.join('\n');
      const redirectUrl = `https://wa.me/${raw}?text=${encodeURIComponent(message)}`;
      return { redirectUrl };
    }
  }
};

export function fmt(n){
  return moneyPKR(n);
}

function safeBuyer(b){
  if(!b) return '—';
  const parts = [];
  if(b.name) parts.push(b.name);
  if(b.email) parts.push(b.email);
  return parts.join(' / ') || '—';
}
