## Project Brief: Add Product Categories & Navigation to 4dcosmetics.com (Behavior-Only Spec)

### 0) Context & Constraints

* Site: `4dcosmetics.com`.
* Stack: plain HTML/CSS/JS (no frameworks), deployed as static pages.
* Data source: JSON files committed in the repo (no server/database).
* Goal: Introduce **Categories** for products with intuitive navigation, clean URLs, fast loading, and good SEO.
* **Do not** add features not listed here. Follow the rules precisely.

---

### 1) Data Model (JSON, no code—just structure)

* `products.json` (single array of product objects). Each product has:

  * `id` (string, unique, stable)
  * `name` (string)
  * `slug` (kebab-case string; stable, URL-safe)
  * `images` (array of URLs; first is default)
  * `price` (number as decimal, e.g., 19.99)
  * `currency` (ISO code, e.g., “SEK” or “EUR”)
  * `categories` (array of category slugs; supports many-to-many)
  * `brand` (string) — optional
  * `tags` (array of strings) — optional
  * `shortDescription` (plain text, ~160 chars)
  * `descriptionHTML` (sanitized HTML string)
  * `inStock` (boolean)
  * `sku` (string) — optional
* `categories.json` (array of category objects). Each category has:

  * `name` (string, human-readable)
  * `slug` (kebab-case, URL segment)
  * `parent` (nullable string of parent category slug; `null` for top-level)
  * `image` (URL) — optional
  * `descriptionHTML` (short sanitized HTML for category landing copy)
  * `sortOrder` (number; lower appears first in menus)
* **Integrity rules**:

  * Every product category slug must exist in `categories.json`.
  * Slugs are lower-case, `a-z0-9-`, no spaces, no trailing slashes.

---

### 2) URL Structure (static-friendly, SEO-friendly)

* Category listing pages:

  * Top-level: `/c/{category-slug}/`
  * Nested: `/c/{parent-slug}/{child-slug}/`
* Product detail pages:

  * `/p/{product-slug}/`
* **No query params** required to view a category or product.
* Filtering/sorting (see §5) may use **query params** (e.g., `?sort=price_asc&brand=…`) but the base page must render without them.
* Trailing slash **required** on category URLs; product URLs **no trailing slash**.
* Render **404** for unknown category/product slugs.

---

### 3) Site Navigation Elements (consistent across pages)

* **Header (global):**

  * Logo (links to `/`).
  * “Shop” primary nav with **Categories mega-menu** showing:

    * Top-level categories, sorted by `sortOrder`.
    * Hover/click opens a panel listing child categories grouped under each parent.
    * Each item links to its category URL. No extra levels beyond what exists in `categories.json`.
  * “Search” input (navigates to `/search/`—behavior spec only, do not implement search here).
  * Cart icon (placeholder link `/cart/`).
* **Breadcrumbs (category & product pages):**

  * Always show a path from Home → parent(s) → current item.
  * Example category: `Home / Skin Care / Serums`.
  * Example product: `Home / Skin Care / Serums / {Product Name}`.
  * Each crumb (except current) is a link to the corresponding URL.
* **Sidebar (category pages only):**

  * Category tree (current branch expanded, others collapsed).
  * Active category **visually highlighted**.
  * Clicking a parent toggles visibility of its children.
* **Footer:**

  * Repeats top-level categories (flat list), plus About, Contact, Privacy, Terms.

---

### 4) Category Page Behavior (listing view)

* **Above the fold**:

  * Category title (H1) and optional `descriptionHTML`.
* **Product grid**:

  * 2–4 columns responsive (auto-wrap).
  * Each card shows image, name, price (with currency), and stock badge if `!inStock` (“Out of stock”).
  * Clicking card goes to `/p/{product-slug}/`.
* **Pagination**:

  * Default 12 products per page (configurable constant).
  * Use query param: `?page=2` etc.
  * Show “Previous / 1 2 3 … / Next”. Disable links at bounds.
* **Empty state**:

  * If a category has zero products after filters, show friendly message and “Clear filters” link (which removes all query params).

---

### 5) Sorting & Filtering (on category pages)

* **Sorting** (dropdown):

  * Options: “Featured” (default), “Price: Low to High”, “Price: High to Low”, “Name: A–Z”, “Newest”.
  * Persist choice via query param `sort` (values `featured`, `price_asc`, `price_desc`, `name_asc`, `newest`).
* **Filters** (checkboxes + range where relevant):

  * `brand` (unique brands in current category’s product set).
  * `inStock` (boolean toggle “Only show in-stock”).
  * `price` (min/max numeric inputs; inclusive).
  * `tags` (only if present in current category set).
* **Filter state**:

  * State reflected in query params (e.g., `?brand=Aura,Glow&inStock=true&priceMin=100&priceMax=300`).
  * On page load, UI reads query params and applies them consistently.
  * Clear-all resets to the category base URL (no params).
* **No server calls**: All filtering and sorting happen in-memory on the client using the loaded JSON.

---

### 6) Product Detail Page Behavior

* Show:

  * Title (H1), price + currency, stock status, SKU (if present).
  * Image gallery (click thumbnails to swap main image; no autoplay).
  * `shortDescription` (plain text) under price.
  * `descriptionHTML` in a “Details” section.
  * Categories list (links back to category pages).
* “Add to Cart” is a **non-functional button** (placeholder) unless specified elsewhere.
* “Back to {Category}” link returns to the last visited category URL if available; otherwise the first listed category.

---

### 7) Active States, Selection, and Consistency Rules

* Active menu item (in header mega-menu and sidebar) must match the current category route exactly (not just substring).
* Breadcrumb and page title must always match the category/product being shown.
* The same product may appear in multiple categories. Do **not** duplicate pages; only one product detail URL, defined by `product.slug`.

---

### 8) Mobile & Accessibility

* **Mobile nav**:

  * Collapsible hamburger menu showing top-level categories; tapping a parent reveals children.
  * Sidebar filters become a slide-in panel. When open, the main page is non-scrollable; tapping backdrop closes it.
* **Touch targets**: Minimum 44×44 px.
* **Keyboard**:

  * Tab order logical; focus visible.
  * Menus and accordions operable with keyboard (Enter/Space toggles).
* **ARIA**:

  * Menus: proper roles and `aria-expanded` on toggles.
  * Breadcrumb: `nav` with `aria-label="Breadcrumb"`.
  * Images: meaningful `alt` text (use product name).
* **No auto-play**, no automatic focus jumps.

---

### 9) Performance

* Load `products.json` and `categories.json` once per session and cache in memory.
* Lazy-load product images with native `loading="lazy"` (behavior specification; do not write code).
* Use width/height attributes or CSS aspect-ratio boxes to prevent layout shift.
* Avoid blocking rendering with heavy assets; defer any non-critical JS.

---

### 10) SEO & Metadata

* **Titles**:

  * Category: `{Category Name} | 4D Cosmetics`
  * Product: `{Product Name} | 4D Cosmetics`
* **Meta description**:

  * Category: derive from `descriptionHTML` (stripped to ~160 chars).
  * Product: use `shortDescription` (~160 chars).
* **Canonical URLs** on category and product pages (point to the clean URL without tracking params).
* **Breadcrumb structured data** using JSON-LD (behavior only).
* Use **Open Graph** tags on product and category pages (image = first category/product image if available).
* XML sitemap entries for `/c/.../` and `/p/.../` URLs (behavior only—do not generate here).

---

### 11) Error Handling & Edge Cases

* Invalid/unknown category slug → 404 page with link back to Home and top-level categories.
* Invalid filter values → ignore silently and keep page usable.
* If `products.json` or `categories.json` fails to load, show a clear error message and a “Retry” button (no auto-retry loops).

---

### 12) Editorial Guidelines for Categories

* Names are concise, user-facing, and consistent in casing (e.g., “Skin Care”, “Hair Care”, “Fragrances”).
* Avoid overlapping meanings; use hierarchy to disambiguate (e.g., Skin Care → Cleansers, Serums, Moisturizers).
* Limit depth to **two levels** (parent → child). No third level.

---

### 13) Analytics (non-blocking)

* Track (placeholder calls only) when users:

  * Open category menu, click a category, change sort, apply/remove a filter, click a product.
* Ensure tracking does **not** block page rendering.

---

### 14) Backwards Compatibility & Redirects

* If any existing product URLs change, define a **301 mapping** from old paths to new `/p/{product-slug}`.
* Existing homepage and non-shop pages remain unchanged.

---

### 15) Acceptance Criteria (must pass)

1. Category pages available at `/c/{…}/` render correct products, title, breadcrumb, and pagination.
2. Sidebar shows the correct active state and hierarchy; header mega-menu lists top-level categories by `sortOrder`.
3. Sorting and filters update the listing and the URL query params; reloading preserves state.
4. Product pages render complete info and link back to categories.
5. Mobile menu and filter drawer function with backdrop locking; keyboard and ARIA checks pass.
6. Images lazy-load; no layout shifts on scroll.
7. Canonical, title, and meta description are present and correct on category and product pages.
8. 404s for unknown slugs work and offer navigation back.
9. No uncaught errors when JSON is missing fields (graceful degradation).
10. No features beyond those listed here are introduced.

---

**End of brief.**

