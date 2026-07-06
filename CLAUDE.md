# 4D Cosmetics — Project Guide

A **static, client-side e-commerce storefront** for a small makeup & cosmetics
shop in Pakistan. Phase-1 scope: browse products, add to cart, and place orders
via **Cash on Delivery confirmed over WhatsApp** (no payment gateway). PKR-only,
mobile-first. Hosted on **GitHub Pages** at `4dcosmetics.com` (see `CNAME`),
deployed from the **`master`** branch.

## Tech stack

- Plain **HTML + CSS + vanilla JS** (no build step for the site itself).
- Product/category data is static **JSON** under `assets/data/`.
- Cart state engine is **simpleCart.js v3.0.5** (`assets/js/simpleCart.min.js`).
- jQuery 2.2.4 and Bootstrap are vendored under `assets/js/` and `assets/css/`.
- `Gruntfile.js` / `bower.json` are legacy and not part of the runtime.

## Directory layout

```
/*.html                 Top-level pages (home, cart, info/policy pages, etc.)
/c/index.html           Collection (category) page — SPA route: /c/<category>/
/p/index.html           Product detail page (PDP) — SPA route: /p/<slug>
/categories/index.html  All-categories landing
/search/index.html      Search results
/404.html               GitHub Pages SPA fallback (serves the shell for /p/ /c/ routes)
/assets/css/            All stylesheets (loaded by <link> in each page)
/assets/js/             All scripts
/assets/data/           products.json, categories.json, footer.links.json
/assets/img/            banner + product images (assets/img/products/)
/assets/schemas/        JSON Schemas for the data files
/scripts/               Node test/validation scripts (run in CI)
```

> **SPA routing:** pretty URLs like `/p/rbory-face-primer` and `/c/makeup/` are
> virtual. GitHub Pages serves `404.html`, which boots the SPA shell; the JS then
> reads `location.pathname` / query params and renders the right product or
> category. This is why `sitemap.xml` lists URLs that have no matching file on
> disk — that is expected, not broken.

## Data flow

1. `assets/js/storefront-runtime.js` fetches `/assets/data/products.json` and
   `/assets/data/categories.json` and exposes a `Storefront` API
   (`Storefront.getAllProducts()` etc.).
2. `assets/js/product-card.js` exposes `ProductCard.renderProductCard(p)` —
   the single product-card renderer used by home, collection, and search.
3. Page controllers consume those:
   - Home: inline script in `index.html` + `home-feed.js` / `home-bonanza.js`
   - Collection (`/c/`): `collection.js`
   - All categories: `categories-page.js`
   - Search (`/search/`): `search-page.js` + `search.js` (+ `search-autocomplete.js`, lazy-loaded by `tabs.js`)
   - PDP (`/p/`): `pdp.js` + `pdp-hydrate.js`

## Content editing (adding products)

Non-technical team members add/edit products through **Pages CMS**
(https://app.pagescms.org) — a hosted, no-code form over this repo. Config lives
in `.pages.yml` at the repo root; its field names mirror
`assets/schemas/products.schema.json`, so saved entries pass CI data validation.
It reads/writes `assets/data/products.json` and uploads images into
`assets/img/products/`. Editors sign in with their own free GitHub accounts
(added as free collaborators — unlimited on private repos). See
`docs/adding-products.md` for the editor-facing guide.

## Cart & checkout (the one canonical flow)

There is **one** cart pipeline. Earlier scattered/legacy cart code has been removed.

- **Engine:** `simpleCart.min.js` — holds cart state in `localStorage`. Loaded on
  every page.
- **Mini-cart drawer:** `cart-drawer.js` — the slide-in drawer UI on every page.
  It is intentionally *"minimal, no cart logic fork"* — it only renders; state
  lives in simpleCart. Auto-loaded via `config.js`.
- **Cart page:** `cart-ui.js` renders the full cart on `cart.html`.
- **Checkout:** `checkout.js` (cart page only) builds the order and hands off to
  `payments.js`, which composes the **WhatsApp COD** message and redirects.
  Orders are saved to `localStorage` and shown on `thank-you.html`.

Prices are **PKR-only**; money formatting is centralized in `assets/js/money.js`.
The WhatsApp number is set via `data-whatsapp` on `<html>` and `whatsapp-fab.js`
renders the floating button on every page.

## Local development

```bash
python3 -m http.server 8099   # then open http://localhost:8099/index.html
```
Use absolute `/assets/...` paths (the site assumes it is served from the domain
root), so a root static server is required — opening files via `file://` breaks.

## Tests / CI (`.github/workflows/ci.yml`)

Run on `master` (data-integrity on every push/PR; lint, meta/JSON-LD, sitemap,
lighthouse on `workflow_dispatch`). They require dev dependencies:

```bash
npm ci
npm run validate:data    # JSON Schema validation of products/categories (ajv)
npm run lint:static      # static-site link/markup lint (jsdom)
npm run test:sitemap     # sitemap guard (fast-xml-parser)
npm run test:features    # feature checks
```

## Recovery notes

The live site once broke because manual GitHub web-UI commits deleted the entire
`/assets/` directory that every page depends on. If the site renders unstyled,
first check that `/assets/css` and `/assets/js` exist and that the
`/assets/...` references in `index.html` resolve. Tags `recovery/last-good-tree`
and `recovery/master-before-restore` mark known states.
