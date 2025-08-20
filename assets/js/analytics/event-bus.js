import ConsentManager from './consent.js';

const EventBus = (() => {
  let seq = 0;
  const queue = [];
  let flushing = false;
  const dedupe = new Set();

  function sessionId() {
    let id = sessionStorage.getItem('session_id');
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      sessionStorage.setItem('session_id', id);
    }
    return id;
  }

  function baseEvent(evt) {
    const now = new Date().toISOString();
    const consent = ConsentManager.getConsent();
    return {
      event: evt.event,
      ts: now,
      context: {
        pageType: document.body.getAttribute('data-page') || 'unknown',
        pageUrl: location.href,
        referrer: document.referrer || '',
        language: document.documentElement.lang || 'en',
        currency: 'USD',
        deviceClass: /Mobi/.test(navigator.userAgent) ? 'mobile' : 'desktop'
      },
      user: { loggedIn: false, userId: undefined, consent },
      session: { id: sessionId(), seq: ++seq },
      ecommerce: evt.ecommerce || undefined,
      meta: evt.meta || undefined,
      clientEventId: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
    };
  }

  function route(eventObj, category) {
    const consent = eventObj.user.consent;
    if (category === 'analytics' && !consent.analytics) return;
    if (category === 'marketing' && !consent.marketing) return;

    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      console.log('event', eventObj);
    }

    try {
      navigator.sendBeacon && navigator.sendBeacon('/api/events', JSON.stringify(eventObj));
    } catch {}
  }

  function flush() {
    flushing = false;
    const items = queue.splice(0, queue.length);
    dedupe.clear();
    items.forEach(({ evt, category }) => route(baseEvent(evt), category));
  }

  function dispatch(eventName, payload = {}, category = 'analytics') {
    const key = eventName + JSON.stringify(payload);
    if (dedupe.has(key)) return;
    dedupe.add(key);
    queue.push({ evt: { event: eventName, ...payload }, category });
    if (!flushing) {
      flushing = true;
      setTimeout(flush, 0);
    }
  }

  ConsentManager.onChange(consent => {
    dispatch('consent_state_change', { meta: { consent } }, 'necessary');
  });

  return { dispatch };
})();

export default EventBus;
