**UPDATES COMING SOON! [Get notified](http://eepurl.com/dHBK11)**


[Sign up](http://eepurl.com/gntUvf) to get updates on new features and releases

# simpleStore

[simpleStore](http://chrisdiana.github.io/simplestore) is a clean, responsive
storefront boilerplate with no database you can setup in minutes. simpleStore is built on
[simpleCart.js](http://simplecartjs.org) and [Skeleton](http://getskeleton.com)
CSS Framework for a lightweight, fast, simple to use, and completely
customizable experience.

![simpleStore Screenshot](https://raw.githubusercontent.com/chrisdiana/simplestore/gh-pages/images/screenshot-v1.1-full.png)
![simpleStore Cart Screenshot](https://raw.githubusercontent.com/chrisdiana/simplestore/gh-pages/images/screenshot-v1.1-cart.png)
![simpleStore Detail Screenshot](https://raw.githubusercontent.com/chrisdiana/simplestore/gh-pages/images/screenshot-v1.1-detail.png)

---

# Features

* No Databases, all client-side (just simple HTML, CSS & Javascript)
* Lightweight & Fast
* Tax Rate Calculations
* Unlimited product attributes
* Shipping
* Multiple Currencies
* Payment Gateways (Paypal, Google Checkout, Amazon Payments)
* For more features check out [simpleCart.js](http://simplecartjs.org)

# Plugins

* Google Sheets (Control products from a Google Sheet instead of JSON file)

# Demo

You can see a working demo [here](http://chrisdiana.github.io/simplestore/demo/)


# Installation

Install with Bower

```
bower install
```

or manually install using the latest [release](https://github.com/chrisdiana/simplestore/releases/latest)


# Setup

1.Make sure simpleStore is on a web server (any type will do as long as it can serve static web pages).

2.Configure your payment options in `payments-config.json`.

3.Edit the `js/config.js` to your liking.

4.Add additional products in the `products.json` file.

# Categories & Products

- Category pages live at `/c/{slug}/` (note the trailing slash). Product pages use `/p/{slug}` without a trailing slash.
- Catalog navigation is category-driven; there is no `/products.html` all-products page.
- Edit `assets/data/categories.json` and `assets/data/products.json` to manage content. Slugs must remain unique and URL-safe.
- GitHub Pages serves `404.html` for deep links. The fallback script loads the proper category or product shell while preserving the original URL. When testing locally, run any static server and navigate directly to `/c/{slug}/` or `/p/{slug}` to verify the handoff.
- To add a new category or product:
  - Add its entry to the appropriate JSON file.
  - Ensure the URL is listed in `sitemap.xml`.
  - New top-level categories automatically appear in the homepage tiles and the header “Shop” menu, and all pages emit correct canonical, Open Graph, and JSON-LD metadata.

## Search & Discovery

- Queries are plain space-separated tokens matched case-insensitively against product name, brand, categories, tags, and short descriptions.
- Ranking weight order: name prefix, name token, brand, category/tag, then short description.
- Optional fields in `products.json`:
  - `createdAt` (ISO 8601) enables a **New** badge when within 30 days.
  - `stockLevel` (integer) triggers **Low stock** when `1–5` and `inStock` is true.
- Badge priority (left→right): Out of stock, Low stock, New, Bestseller (`tags` includes `"bestseller"`).
- Recently viewed products are stored in `localStorage` under `recently_viewed` (up to 8 slugs).
- The `/search/` route is client-rendered and contains `<meta name="robots" content="noindex, follow">` with no canonical tag.

# Using Plugins

To use a plugin, add a reference just before your `config.js` file

```
<script src="plugins/google-sheets.js"></script>
<script src="js/config.js"></script>
```

## HTML Version

If you are looking for something more basic, check out the [HTML version on this
branch](https://github.com/chrisdiana/simplestore/tree/simplestore-html).
The HTML version uses plain HTML to build the store instead of a JSON
file.

Add additional products using the `<div class="simpleCart_shelfItem"></div>` tags.

## Credit where credit is due

For further documentation on expanding/tweaking simpleStore, check out the
framework/plugin pages.

* [Skeleton](http://getskeleton.com)
* [simpleCart.js](http://simplecartjs.org)
* [Normalize.css](http://necolas.github.io/normalize.css)
* [FontAwesome](http://fortawesome.github.io/Font-Awesome)
* [jQuery](https://jquery.com/)

### A note about JavaScript shopping carts

ALL JavaScript shopping carts are NOT fullproof. Because simpleStore is fully
client-side, some users may attempt to alter prices before checkout.
SimpleStore does the best it can to minimize this
kind of activity. Make sure to monitor your sales. Just like in real life, if someone
walks into your store and changes the price tag, you will certainly not honor
those changes.


# Contributing

All forms of contribution are welcome: bug reports, bug fixes, pull requests and simple suggestions.
If you do wish to contribute, please follow the [Airbnb Javascript Style Guide](https://github.com/airbnb/javascript) Thanks!


## List of contributors

You can find the list of contributors [here](https://github.com/chrisdiana/simplestore/graphs/contributors).

## QA & CI

A GitHub Actions workflow (`ci.yml`) runs on pushes and pull requests. It currently checks:

- **Data Integrity** – `npm run validate:data` validates `assets/data/categories.json` and `products.json` against JSON schemas in `assets/schemas/` and ensures slugs and references are consistent.
- **Static Site Lint & Lighthouse** – placeholder jobs reserved for HTML/link checks and performance budgets.

### Fixing common failures

- **Schema violations**: review the error output and compare the JSON files with the corresponding schema.
- **Missing image dimensions or broken links**: ensure each `<img>` element includes width/height and that internal links resolve to valid pages.

### Adding products or categories

1. Add the entry to `assets/data/categories.json` or `assets/data/products.json`.
2. Confirm the slug is unique and URL-safe (lowercase kebab-case).
3. Include the new URL in `sitemap.xml` so it is discoverable.

### Diagnostics overlay

A lightweight diagnostics overlay is available for development.

- Enable with the `?debug=1` query parameter or the `Ctrl+Alt+D` keyboard shortcut.
- Displays counts of loaded products/categories, current route info, canonical URL, and breadcrumb JSON-LD.
- Press <kbd>Escape</kbd> or the close button to dismiss; focus returns to the toggle button.
- The overlay container carries a `data-noindex` attribute and is omitted from production builds.
