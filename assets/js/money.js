export function moneyPKR(value) {
  const n = Number(value || 0);
  try {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(n);
  } catch {
    return '₨ ' + n.toLocaleString('en-PK', { maximumFractionDigits: 0 });
  }
}

if (typeof window !== 'undefined') {
  window.moneyPKR = moneyPKR;
}
