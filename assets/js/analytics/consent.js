const ConsentManager = (() => {
  const KEY = 'site_consent';
  const VERSION = 1;
  const listeners = [];

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultConsent();
      const data = JSON.parse(raw);
      if (data.version !== VERSION) return defaultConsent();
      return {
        necessary: true,
        analytics: !!data.analytics,
        marketing: !!data.marketing,
        version: VERSION,
        ts: data.ts || new Date().toISOString()
      };
    } catch {
      return defaultConsent();
    }
  }

  function defaultConsent() {
    return {
      necessary: true,
      analytics: false,
      marketing: false,
      version: VERSION,
      ts: new Date().toISOString()
    };
  }

  let consent = read();

  function save(next) {
    consent = { ...consent, ...next, necessary: true, version: VERSION, ts: new Date().toISOString() };
    try {
      localStorage.setItem(KEY, JSON.stringify(consent));
    } catch {}
    listeners.forEach(cb => cb(consent));
  }

  function onChange(cb) {
    listeners.push(cb);
  }

  function getConsent() {
    return consent;
  }

  return { getConsent, save, onChange };
})();

export default ConsentManager;
