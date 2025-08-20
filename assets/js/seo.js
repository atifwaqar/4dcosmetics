export function applySEO(cfg = {}) {
  const {
    canonical,
    title,
    description,
    robots,
    og = {},
    twitter = {},
    schemaBlocks = []
  } = cfg;

  if (title) document.title = title;

  let link = document.querySelector('link[rel="canonical"]');
  if (canonical) {
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = canonical;
  } else if (link) {
    link.remove();
  }

  let descEl = document.querySelector('meta[name="description"]');
  if (description) {
    if (!descEl) {
      descEl = document.createElement('meta');
      descEl.name = 'description';
      document.head.appendChild(descEl);
    }
    descEl.setAttribute('content', description);
  } else if (descEl) {
    descEl.remove();
  }

  let robotsEl = document.querySelector('meta[name="robots"]');
  if (robots) {
    if (!robotsEl) {
      robotsEl = document.createElement('meta');
      robotsEl.name = 'robots';
      document.head.appendChild(robotsEl);
    }
    robotsEl.setAttribute('content', robots);
  } else if (robotsEl) {
    robotsEl.remove();
  }

  const ogDefaults = {
    type: 'website',
    url: canonical || window.location.href,
    image: `${window.location.origin}/assets/img/logo.png`,
    title,
    description
  };
  const ogData = { ...ogDefaults, ...og };
  ['type', 'title', 'description', 'image', 'url'].forEach(key => {
    const prop = `og:${key}`;
    let el = document.querySelector(`meta[property="${prop}"]`);
    if (ogData[key]) {
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', prop);
        document.head.appendChild(el);
      }
      el.setAttribute('content', ogData[key]);
    } else if (el) {
      el.remove();
    }
  });

  if (twitter.card) {
    let tw = document.querySelector('meta[name="twitter:card"]');
    if (!tw) {
      tw = document.createElement('meta');
      tw.name = 'twitter:card';
      document.head.appendChild(tw);
    }
    tw.setAttribute('content', twitter.card);
  }

  const baseBlocks = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      'name': '4D Cosmetics',
      'url': `${window.location.origin}/`,
      'logo': `${window.location.origin}/assets/img/logo.png`
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      'url': `${window.location.origin}/`,
      'potentialAction': {
        '@type': 'SearchAction',
        'target': `${window.location.origin}/search/?q={search_term_string}`,
        'query-input': 'required name=search_term_string'
      }
    }
  ];
  const blocks = [...baseBlocks, ...schemaBlocks];
  if (blocks.length) {
    let ld = document.getElementById('ld-json');
    if (!ld) {
      ld = document.createElement('script');
      ld.type = 'application/ld+json';
      ld.id = 'ld-json';
      document.head.appendChild(ld);
    }
    ld.textContent = JSON.stringify(blocks);
  }
}
