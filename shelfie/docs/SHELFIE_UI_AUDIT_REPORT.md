# SHELFIE — COMPREHENSIVE UI/UX & QA DEFECT AUDIT REPORT

**Date:** October 10, 2026  
**Auditor:** Senior Full-Stack & UI/UX Automation Engineer  
**Scope:** Complete application audit across all 11 routes running on `http://localhost:3000`  
**Test Method:** Live browser exploratory testing, automated screenshot captures, DOM layout analysis, and source code token cross-referencing.

---

## Executive Summary

While the **Shelfie** homepage has established a strong consumer-facing brand identity, the audit revealed **critical visual bugs, high-contrast readability failures, CSS token desynchronization, and jarring theme discontinuities** across secondary and portal routes.

### Primary Global Issues
1. **CSS Design System Disconnect:** Secondary pages (`/search`, `/shop/dashboard`, `/reserve/[id]`) heavily rely on legacy CSS variables (`--border-light`, `--border-medium`, `--accent`, `--bg-subtle`, `--text-tertiary`, `--status-amber`) that **do not exist** in `globals.css`. Because Tailwind cannot resolve these tokens, borders fall back to `currentColor` (solid black `#111827`) and backgrounds fall back to `transparent`, breaking contrast and creating harsh black wireframe borders.
2. **Theme Inversion (Dark vs. Light Discontinuity):** The homepage and search page are light mode (`#f4f5f7`), but `/login`, `/shop/inventory`, `/shop/onboard`, `/brand/dashboard`, and `/request` are hardcoded in dark mode (`bg-slate-900`). Transitioning between them is visually jarring and breaks user orientation.
3. **Severe Contrast Defect (White-on-White Text):** In `/request/[id]`, the status card uses `.card` (which is white `#ffffff` in CSS), but the headers inside have hardcoded `text-white`, rendering them **completely invisible**.
4. **Unhandled Parameterless States:** Pages like `/reserve` and `/request` render bare, unstyled plain text `Invalid link` with no layout, logo, or return buttons when accessed without URL query parameters.

---

## Page-by-Page Audit & UI Defects

---

### 1. Homepage (`/`)
*Route:* [app/page.tsx](file:///Users/vkshivakumar/shelfie/shelfie/app/page.tsx)  
*Status:* Visually polished, but contains layout clipping and grid alignment defects.

| Severity | Element | Issue Description | Root Cause / Fix |
| :--- | :--- | :--- | :--- |
| **High** | Hero Carousel Banners | Top-left pill (`Verified Chemist Stock`) and bottom-left tag (`100% Genuine...`) clip against the card's rounded borders and gradients. Slider arrows (`<` and `>`) overlay directly on top of the headline and price text (`From ₹28*`). | Increase padding in banner wrapper; reposition carousel arrow buttons to outer margins or top-right. |
| **Medium** | "Emergency Pharmacy" Grid | 6-column grid renders only 4 items, leaving 2 large empty grey blocks on the right side of the screen on desktop viewports. | Use `grid-cols-2 md:grid-cols-4 lg:grid-cols-6` or allow cards to stretch via `auto-fit` flex/grid. |
| **Medium** | Distance Badge | Product cards display `Sri Ganesh Elect... 0m` with a walking icon when geolocation is default or matching. | Format distances under 50m as `< 1 min walk` or `Nearby` instead of `0m`. |
| **Low** | "Become a Seller" Nav Link | "Become a Seller" in the navbar links directly to `/shop/dashboard` instead of the onboarding wizard `/shop/onboard`. | Update link target to `/shop/onboard`. |
| **Low** | Product Imagery Language | Disparate 3D emoji representations (e.g., CRT vintage television for modern HDMI Cable, floppy disk for USB pendrive). | Normalize emoji mappings or integrate product thumbnail images. |

---

### 2. Search & Discovery Page (`/search?q=...`)
*Route:* [app/search/page.tsx](file:///Users/vkshivakumar/shelfie/shelfie/app/search/page.tsx)  
*Status:* **Severely degraded visual quality** due to unresolved CSS tokens.

| Severity | Element | Issue Description | Root Cause / Fix |
| :--- | :--- | :--- | :--- |
| **High** | Layout Borders & Dividers | Results list, cards, and dividers have harsh, thick solid black borders `#111827`. | Uses undefined variable `border-[var(--border-light)]`. Replace with `border-[var(--border-sm)]` from `globals.css`. |
| **High** | Cart Header Button | The cart button next to search is rendered with `bg-[var(--accent)]`, which resolves to transparent. The bag icon and count float unstyled with no background container. | Replace `var(--accent)` with `var(--brand-500)` or `var(--bg-surface)` with solid border. |
| **Medium** | Promoted Offer Tag | The `PROMOTED` badge on sponsored cards appears faint grey, unstyled, and floats awkwardly. | Replace `var(--accent)` and `var(--accent-subtle)` with `--brand-500` and `--brand-100`. |
| **Medium** | Search Header Branding | Header is disconnected from the main site branding (uses plain unstyled black text "Shelfie", lacks location selector and account controls). | Re-use the unified header component or match typography tokens. |
| **Low** | Result Card Spacing | Product cards use plain native buttons with raw black borders rather than the sleek `Add to Bag` button style from the homepage. | Harmonize `OfferCard` button styling with `PremiumProductCard`. |

---

### 3. Cart & Checkout Summary (`/cart`)
*Route:* [app/cart/page.tsx](file:///Users/vkshivakumar/shelfie/shelfie/app/cart/page.tsx)  
*Status:* Functional, but poorly proportioned layout on desktop.

| Severity | Element | Issue Description | Root Cause / Fix |
| :--- | :--- | :--- | :--- |
| **High** | Desktop Layout Balance | Content is confined to a narrow `max-w-2xl` column on the left side; over 65% of the right screen is empty canvas. | Implement a 2-column e-commerce layout on desktop (Bag items on left, Sticky Order Summary & Identity card on right). |
| **Medium** | Identity Verification Form | Phone number input is a bare text field with default `+91`, lacking phone formatting, clear helper text, or visual validation states. | Add clear country code selector, masked phone input, and security trust badges. |
| **Low** | Grammar & Labeling | Submit button reads `"Hold 1 Items Now"` with incorrect pluralization. | Fix conditional pluralization: `qty === 1 ? 'Item' : 'Items'`. |
| **Low** | Store Header Distinction | Store grouping header has small text (`PICKUP LOCATION 1 OF 1`) and minimal separation from item rows. | Increase contrast and padding of store group cards. |

---

### 4. Item Request Broadcast (`/request` & `/request/[id]`)
*Routes:* [app/request/page.tsx](file:///Users/vkshivakumar/shelfie/shelfie/app/request/page.tsx) & [app/request/[id]/page.tsx](file:///Users/vkshivakumar/shelfie/shelfie/app/request/[id]/page.tsx)  
*Status:* **Critical contrast bugs & missing states.**

| Severity | Element | Issue Description | Root Cause / Fix |
| :--- | :--- | :--- | :--- |
| **Critical** | Status Confirmation Header | In `/request/[id]`, the header `<h2>Pinging {shopName}...</h2>` uses `text-white` inside a `.card` that has a white background (`#ffffff`), rendering the text **completely invisible**. | Replace `text-white` with `text-[var(--text-primary)]`. |
| **High** | Direct Access Fallback | Navigating to `/request` without `?s=...&i=...` renders an unstyled white screen with the plain string `Invalid link`. | Provide an empty state card with a "Browse inventory" button and return link. |
| **Medium** | Invalid Tailwind Class | `app/request/page.tsx:119` specifies `padding-12px-24px`, which is an invalid CSS class name. | Replace with standard `py-3 px-6`. |
| **Medium** | Theme Inconsistency | Request form uses `bg-slate-800` dropdown selects inside an undefined light/dark container. | Harmonize with standard form input tokens (`bg-[var(--bg-surface)]`, `border-[var(--border-sm)]`). |

---

### 5. Authentication (`/login`)
*Route:* [app/login/page.tsx](file:///Users/vkshivakumar/shelfie/shelfie/app/login/page.tsx)  
*Status:* Layout spacing imbalance and overlapping line borders.

| Severity | Element | Issue Description | Root Cause / Fix |
| :--- | :--- | :--- | :--- |
| **High** | Visual Void in Left Hero | The 3 feature bullet cards are anchored to the bottom edge, leaving a massive empty black void in the center of the left panel. | Center the value proposition content vertically with balanced spacing. |
| **High** | Overlapping Divider Line | A thin horizontal border cuts directly across the bottom of the `Continue ->` button and intersects the helper text. | Remove the misplaced divider or add appropriate `my-6` margins. |
| **Medium** | Form Surface Elevation | The login form on the right half floats in raw white canvas without a card boundary, shadow, or clear framing. | Wrap the login form in a defined `.card` surface with subtle border and elevation. |
| **Low** | Extreme Top Margin | The "Shelfie" brand title in the top-left has almost zero top padding (`p-6` vs standard `p-10`). | Normalize header padding to `p-8` or `p-10`. |

---

### 6. Merchant Portal (`/shop/dashboard`, `/shop/inventory`, `/shop/onboard`)
*Routes:* [app/shop/dashboard/page.tsx](file:///Users/vkshivakumar/shelfie/shelfie/app/shop/dashboard/page.tsx), [app/shop/inventory/page.tsx](file:///Users/vkshivakumar/shelfie/shelfie/app/shop/inventory/page.tsx), [app/shop/onboard/page.tsx](file:///Users/vkshivakumar/shelfie/shelfie/app/shop/onboard/page.tsx)  
*Status:* Fragmented layout, unstyled elements, and mismatched themes.

| Severity | Element | Issue Description | Root Cause / Fix |
| :--- | :--- | :--- | :--- |
| **High** | Dashboard Viewport Emptiness | On desktop screens, three narrow column headers leave ~70% of the viewport completely blank. | Provide a structured grid layout with summary metrics cards (Daily Revenue, Today's Orders, Inventory Health). |
| **High** | "Completed" Column Missing Card | The "Completed" column has no card border or background container, unlike "Inbound Requests" and "Active Holds". | Wrap in standard surface card with matching header and empty state styling. |
| **High** | Detached Floating Verification Bar | The "Enter pickup code..." input floats fixed at the bottom with no contextual bar or dock framing. | Anchor the verification tool into a dedicated merchant action header or sidebar card. |
| **High** | Inverted Theme in Inventory & Onboarding | `/shop/inventory` and `/shop/onboard` use hardcoded dark theme (`bg-slate-900`, `bg-slate-800`), conflicting with the light-mode dashboard. | Standardize merchant portal pages to a consistent light dashboard theme. |
| **Medium** | WhatsApp Drawer Clutter | Floating WhatsApp drawer on bottom right has an empty state that looks like a broken iframe. | Make drawer collapsible with an expandable badge/trigger button. |

---

### 7. Brand Portal (`/brand/dashboard`)
*Route:* [app/brand/dashboard/page.tsx](file:///Users/vkshivakumar/shelfie/shelfie/app/brand/dashboard/page.tsx)  
*Status:* Hardcoded dark mode and hardcoded mock brand.

| Severity | Element | Issue Description | Root Cause / Fix |
| :--- | :--- | :--- | :--- |
| **High** | Hardcoded Dark Theme | Page is styled exclusively in `bg-slate-900` / `bg-slate-800`, isolated from the rest of the application. | Align styling to the master design system or implement a unified dark mode toggle. |
| **Medium** | Hardcoded Brand State | Brand ID is hardcoded to `brand_dell` with no switcher or brand context selector. | Add brand switcher dropdown matching the merchant dashboard selector. |

---

### 8. Reservation Confirmation (`/reserve/[id]`)
*Route:* [app/reserve/[id]/page.tsx](file:///Users/vkshivakumar/shelfie/shelfie/app/reserve/%5Bid%5D/page.tsx)  
*Status:* Missing CSS tokens causing subtle border/status color fallbacks.

| Severity | Element | Issue Description | Root Cause / Fix |
| :--- | :--- | :--- | :--- |
| **Medium** | Status Badge & Border Tokens | Uses `--border-light`, `--bg-subtle`, `--status-amber`, `--status-green-bg` which do not exist in `globals.css`. | Replace with defined tokens: `--border-sm`, `--bg-surface-2`, `--amber`, `--green-bg`. |
| **Medium** | Fallback on Direct `/reserve` | Navigating to `/reserve` without `?s=...&i=...` yields plain text `Invalid link`. | Provide friendly error state with link back to homepage. |

---

## Action Plan & Recommended Priority Fixes

1. **P0 (Critical Bugs):**
   - Fix invisible text bug in `app/request/[id]/page.tsx` (`text-white` -> `text-[var(--text-primary)]`).
   - Fix missing CSS tokens in `app/search/page.tsx` and `app/reserve/[id]/page.tsx` (replace undefined `--border-light`, `--accent`, `--bg-subtle` with valid tokens).
   - Fix overlapping horizontal line on `app/login/page.tsx`.

2. **P1 (Design System & Layout Polish):**
   - Convert `app/cart/page.tsx` to a balanced 2-column layout on desktop.
   - Fix carousel text and button clipping in `app/page.tsx`.
   - Harmonize merchant portals (`/shop/inventory`, `/shop/onboard`) and brand portal (`/brand/dashboard`) to use consistent theme tokens.

3. **P2 (Edge Case Handling & Empty States):**
   - Provide branded empty states for parameterless visits to `/request` and `/reserve`.
   - Fix grammar in cart button (`Hold 1 Item Now`).
   - Update navbar "Become a Seller" link to point to `/shop/onboard`.
