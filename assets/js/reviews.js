// Basic reviews bootstrap and analytics hooks.
// Initializes lazy-loading and dispatches analytics events.

function fire(event, data) {
  try {
    if (window.gtag) {
      window.gtag('event', event, data);
    } else if (window.Analytics && typeof window.Analytics[event] === 'function') {
      // fallback to Analytics object if available
      window.Analytics[event](data);
    } else {
      console.debug('analytics event', event, data);
    }
  } catch (e) {
    console.warn('analytics error', e);
  }
}

function observeOnce(el, options, callback) {
  if (!el) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        io.disconnect();
        callback(entry.target);
      }
    });
  }, options);
  io.observe(el);
}

function lazyLoadSection() {
  const section = document.querySelector('[data-region="reviews"]');
  observeOnce(section, { rootMargin: '200px' }, () => {
    import('./reviews-bundle.js').catch(() => {
      console.warn('reviews bundle failed to load');
    });
  });
}

function trackSummary() {
  const summary = document.querySelector('[data-region="reviews-summary"]');
  observeOnce(summary, { rootMargin: '0px 0px -50% 0px' }, () => {
    fire('reviews_summary_impression');
  });
}

function initAnalyticsEvents() {
  document.addEventListener('click', (e) => {
    const open = e.target.closest('[data-action="review-open"]');
    if (open) fire('reviews_open_form');

    const helpful = e.target.closest('[data-action="review-helpful"]');
    if (helpful) {
      fire('review_helpful_click', {
        id: helpful.dataset.reviewId,
        vote: helpful.dataset.vote
      });
    }

    const report = e.target.closest('[data-action="review-report"]');
    if (report) fire('review_report_click', { id: report.dataset.reviewId });

    const loadMore = e.target.closest('[data-action="reviews-load-more"]');
    if (loadMore) fire('reviews_load_more');
  });

  document.addEventListener('change', (e) => {
    const controls = e.target.closest('[data-component="reviews-controls"]');
    if (!controls) return;
    const el = e.target;
    if (el.name === 'sort') {
      fire('reviews_sort_change', { value: el.value });
    } else {
      fire('reviews_filter_change', { name: el.name, value: el.value });
    }
  });
}

if (document.readyState !== 'loading') {
  trackSummary();
  lazyLoadSection();
  initAnalyticsEvents();
} else {
  document.addEventListener('DOMContentLoaded', () => {
    trackSummary();
    lazyLoadSection();
    initAnalyticsEvents();
  });
}

