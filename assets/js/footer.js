(async function () {
  const footerRoot = document.querySelector('[data-region="site-footer"]');
  if (!footerRoot) return;

  try {
    const res = await fetch('/assets/data/footer.links.json');
    const data = await res.json();

    const container = document.createElement('div');
    container.className = 'container';

    const row = document.createElement('div');
    row.className = 'row';

    data.columns.forEach(col => {
      const colDiv = document.createElement('div');
      colDiv.className = 'col-6 col-md-3 mb-3';

      const heading = document.createElement('h6');
      heading.textContent = col.section;
      colDiv.appendChild(heading);

      const ul = document.createElement('ul');
      ul.className = 'list-unstyled';

      col.links.forEach(link => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.textContent = link.label;
        a.href = link.href;
        if (link.action) {
          a.setAttribute('data-action', link.action);
        }
        a.addEventListener('click', () => {
          window.dispatchEvent(new CustomEvent('footer_link_click', {
            detail: { section: col.section, label: link.label, href: link.href }
          }));
          if (link.action === 'open-consent-preferences') {
            window.dispatchEvent(new CustomEvent('footer_consent_open'));
          }
        });
        li.appendChild(a);
        ul.appendChild(li);
      });

      colDiv.appendChild(ul);
      row.appendChild(colDiv);
    });

    container.appendChild(row);

    // Newsletter
    const newsletterForm = document.createElement('form');
    newsletterForm.setAttribute('data-component', 'footer-newsletter');
    newsletterForm.className = 'd-flex gap-2 my-4';
    newsletterForm.innerHTML = `
      <label for="footer-newsletter-email" class="visually-hidden">Email</label>
      <input id="footer-newsletter-email" type="email" class="form-control" placeholder="you@example.com" required>
      <button class="btn btn-primary" type="submit">Subscribe</button>
      <span class="ms-2 small" id="footer-newsletter-msg"></span>
    `;
    newsletterForm.addEventListener('submit', e => {
      e.preventDefault();
      const msg = document.getElementById('footer-newsletter-msg');
      msg.textContent = 'Thanks for subscribing!';
      window.dispatchEvent(new CustomEvent('footer_newsletter_submit', { detail: { status: 'success' } }));
    });
    container.appendChild(newsletterForm);

    // Locale selectors
    const localeWrapper = document.createElement('div');
    localeWrapper.className = 'd-flex gap-2 justify-content-center align-items-center mt-3';

    const langSelect = document.createElement('select');
    langSelect.setAttribute('data-action', 'change-language');
    langSelect.className = 'form-select w-auto';
    langSelect.innerHTML = `
      <option value="en">English</option>
      <option value="sv">Svenska</option>
    `;

    const curSelect = document.createElement('select');
    curSelect.setAttribute('data-action', 'change-currency');
    curSelect.className = 'form-select w-auto';
    curSelect.innerHTML = `
      <option value="EUR">EUR</option>
      <option value="SEK">SEK</option>
    `;

    const live = document.createElement('span');
    live.className = 'visually-hidden';
    live.setAttribute('aria-live', 'polite');

    langSelect.addEventListener('change', () => {
      const val = langSelect.value;
      localStorage.setItem('locale.language', val);
      live.textContent = `Language set to ${langSelect.options[langSelect.selectedIndex].text}`;
      window.dispatchEvent(new CustomEvent('footer_locale_change', { detail: { language: val } }));
    });

    curSelect.addEventListener('change', () => {
      const val = curSelect.value;
      localStorage.setItem('locale.currency', val);
      live.textContent = `Currency set to ${val}`;
      window.dispatchEvent(new CustomEvent('footer_locale_change', { detail: { currency: val } }));
    });

    localeWrapper.appendChild(langSelect);
    localeWrapper.appendChild(curSelect);
    localeWrapper.appendChild(live);
    container.appendChild(localeWrapper);

    const bottom = document.createElement('div');
    bottom.className = 'text-center mt-4';
    bottom.innerHTML = '<p class="mb-0">&copy; 4D Cosmetics</p>';
    container.appendChild(bottom);

    footerRoot.appendChild(container);
  } catch (err) {
    console.error('Failed to load footer', err);
  }
})();
