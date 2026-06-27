# 4D Cosmetics — Code Duplication & Consolidation Audit

_Goal: one source of truth per concern, so the "same button" (and same logic)
is reused everywhere instead of being re-implemented per page._

## How this audit was done (repeatable method)

1. **Interaction tracing** — pick one user action (e.g. *click Add to Cart*) and
   follow it across files: DOM event → handler → state change → UI reaction.
   Every extra implementation passed through is a duplicate.
2. **Live-vs-dead separation** — a headless-browser crawl of every page type
   records which JS/CSS actually load, so we fix *live* duplication and delete
   *dead* code instead of refactoring things nothing uses.
3. **Verify by behavior** — after each change, re-load home, collection, search
   and PDP and assert the behavior (e.g. drawer opens, cart qty correct).

> Why this matters: static reading of the cart code *looks* broken (an
> `ITEM_CACHE` gate, four add paths), but behavior testing proved the PDP
> Add-to-Cart drawer **already works** on current `master`. Always verify.

---

## Findings

### 1. Cards & Add-to-Cart — ⚠️ real duplication (highest priority)

**Adding to the cart is implemented in 4 places:**
`product-card.js`, `ui-cards.js`, `pdp.js`, `pdp-hydrate.js` each call
`simpleCart.add(...)` with their own object shape.

**Card rendering exists in 2 places:**
- `ProductCard.renderProductCard()` (`product-card.js`) — the intended single
  renderer, used by home, collection, search.
- `buildProductCard()` (`ui-cards.js`) — a legacy renderer, now mostly
  monkey-patched to delegate to `ProductCard`, but still carries its own
  click handlers and an `Analytics` object.

**The PDP binds the button twice:** both `pdp.js` and `pdp-hydrate.js` attach a
click handler to `[data-atc]`. `pdp.js`'s handler is **dead** — `pdp-hydrate.js`
re-renders the button element afterward, discarding `pdp.js`'s listener. (This is
why adding from the PDP increments quantity by 1, not 2.)

**Drawer-open is coupled to the card cache.** The "drawer opens" reaction lives
inside `product-card.js`'s `showAddedToast()`, reached only when
`ITEM_CACHE[id]` exists (populated solely by `renderProductCard`). The PDP works
anyway because `pdp.js`/`pdp-hydrate.js` *also* call the global `showAddedToast`,
which `cart-drawer.js` overrides to call `CartDrawer.open()`. The result is
correct but fragile — drawer-open should be a *reaction to an add*, not wired
through a toast function and a card-only cache.

**Status:** behavior is currently correct (verified: drawer opens on home and
PDP, quantity correct, no double-add), but the structure is fragile and hard to
change safely.

**Target:**
- `Cart.add(product, qty)` — the **only** function allowed to touch `simpleCart`.
- The drawer **subscribes** to simpleCart's `afterAdd` event and opens itself —
  decoupled, so *every* add opens it and the `ITEM_CACHE` gate disappears.
- One delegated Add-to-Cart handler that reads the product from `data-*`
  attributes, used identically by cards **and** the PDP.
- Keep `ProductCard.renderProductCard`; delete `buildProductCard` + fallbacks.
- Wire the PDP button once (remove `pdp.js`'s dead ATC path).

### 2. Price / currency formatting — ✅ already consolidated

`money.js` exposes `moneyPKR()` and effectively everything routes through it
(`product-card.js`, `cart-ui.js`, `cart-drawer.js`, `pdp.js`, `pdp-hydrate.js`,
`payments.js`). Only cleanup: the redundant `formatPrice()` wrapper in
`product-card.js` (it just calls `moneyPKR`). **Low priority.**

### 3. Header / nav / footer — ⚠️ real duplication

The `bnz-header` and `bnz-footer` markup is **hand-copied into 19 HTML files**.
There is no shared source, so changing the phone number, a nav link, or the
footer means editing 19 files (and risking drift). The category tab strip is the
one dynamic part (rendered by `tabs.js`).

**Target (static-site friendly):** extract the header and footer into a single
source and inject them on each page — either a tiny `partials.js` that fetches
`/partials/header.html` + `/partials/footer.html` into placeholders, or a small
build step. A JS include keeps the no-build workflow.

### 4. Wishlist — ⚠️ real duplication

`toggleWishlist()` + `load/save` against the same `localStorage` key
`wishlist_ids_v1` is re-implemented in **3 files**: `product-card.js`, `pdp.js`,
and `wishlist.js`. Three copies of identical logic.

**Target:** one `Wishlist` module (`Wishlist.toggle/has/list`); the card, PDP,
and wishlist page all call it.

### 5. Analytics — ⚠️ minor duplication

The gtag/dataLayer event wrapper is duplicated in `ui-cards.js` (`Analytics`
object) and `search-autocomplete.js` (`analyticsEvent`). Both guard on
`window.gtag` / `window.dataLayer`.

**Target:** one `Analytics` module imported by both.

---

## Prioritized consolidation roadmap

Each step is small and verified with the browser harness before moving on.

| # | Step | Risk | Payoff |
|---|------|------|--------|
| 1 | **Cart module + drawer listens to `afterAdd`**; route all 4 add sites through `Cart.add`; remove `ITEM_CACHE` gate | med | single add path; drawer can never silently fail to open |
| 2 | **One Add-to-Cart button behavior** (data-attribute driven) for cards + PDP; remove `pdp.js` dead ATC binding | med | the "same button everywhere" goal |
| 3 | **One card renderer** — delete `buildProductCard` + collection/search fallbacks | low | removes the 2nd renderer |
| 4 | **One Wishlist module** — collapse the 3 copies | low | |
| 5 | **One Analytics module** — collapse the 2 copies | low | |
| 6 | **Shared header/footer partials** injected into all 19 pages | med | edit-once chrome |
| 7 | Remove redundant `formatPrice` wrapper | trivial | |

Steps 1–2 are the heart of what was requested (single, object-oriented
Add-to-Cart used identically everywhere). 3–7 are mechanical cleanups that
follow naturally.
