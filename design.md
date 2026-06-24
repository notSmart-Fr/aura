# AURA | Design System & Visual Specification

This document details the architectural design system and visual guidelines for the **AURA** luxury minimalist apparel storefront, derived from the Toteme-inspired structural code.

---

## 1. Design System Tokens & Configuration

These tokens define our styling primitives and must be implemented exactly within the Tailwind configuration (`apps/storefront/tailwind.config.js`) to guarantee uniform spacing, sizing, and colors.

### A. Color Palette (`theme.extend.colors`)

Our visual canvas is built around a pristine, high-contrast white and deep charcoal/black palette. Artificial shadow overlays, glowing borders, or heavy gradients are prohibited.

| Token | Hex Value | Purpose / Usage |
| --- | --- | --- |
| `primary` | `#000000` | Heavy text headers, core interactive borders, action backgrounds. |
| `secondary` | `#5d5f5f` | Secondary labels, subtexts, auxiliary borders. |
| `graphite` | `#333333` | Campaign text content overlays, highly readable dark charcoal. |
| `background` | `#ffffff` | Viewport body background. Uniform canvas. |
| `surface` | `#ffffff` | Layout background components (e.g. Nav, Footer, Cards). |
| `silver-sand` | `#E5E5E5` | Hairline dividers, light layout borders. |
| `on-primary-container` | `#848484` | Muted secondary label descriptions. |

*Restraint Rule:* All background elements, including the navigation header, main canvas, and footer container must share the uniform `#ffffff` background to eliminate visual splits during scroll events.

### B. Border Radius (`theme.extend.borderRadius`)

To emphasize architectural precision and structured geometry, all components must use absolute zero-radius corners.

* `DEFAULT`: `0px`
* `lg`: `0px`
* `xl`: `0px`
* `full`: `0px`

*Tailwind Helper Class:* Use `rounded-none` or custom configuration to ensure sharp-edges.

### C. Layout Spacing (`theme.extend.spacing`)

Structured margins and stack heights ensure spacious, luxury editorial spacing.

* `gutter`: `1px` (for hairline divided borders and grids)
* `margin-mobile`: `20px` (mobile viewport outer margins)
* `margin-tablet`: `40px` (tablet viewport outer margins)
* `margin-desktop`: `80px` (desktop viewport outer margins)
* `stack-sm`: `20px` (small vertical element spacing)
* `stack-md`: `40px` (medium structural item padding/spacing)
* `stack-lg`: `80px` (large structural item padding/spacing)
* `stack-xl`: `160px` (very large section spacing)
* `container-max`: `1440px` (maximum screen container width)

### D. Typography & Hierarchy

The brand identity is expressed through two primary font families:

* **EB Garamond** (Serif): Used for hero headers, displays, and structural quotes.
* **Hanken Grotesk** (Sans-serif): Used for labels, small headers, body copy, and UI metadata.

#### Font Settings Map (`theme.extend.fontSize` / `theme.extend.fontFamily`)

* **`display-lg`**: `EB Garamond` — `64px` | Line-height: `1.1` | Letter-spacing: `-0.02em` | Font-weight: `400`
* **`body-md`**: `Hanken Grotesk` — `14px` | Line-height: `1.6` | Font-weight: `400`
* **`label-lg`**: `Hanken Grotesk` — `12px` | Line-height: `1` | Letter-spacing: `0.15em` | Font-weight: `500`
* **`headline-sm`**: `Hanken Grotesk` — `18px` | Line-height: `1.4` | Letter-spacing: `0.1em` | Font-weight: `600`
* **`headline-md`**: `EB Garamond` — `32px` | Line-height: `1.3` | Font-weight: `400`
* **`headline-lg`**: `EB Garamond` — `40px` | Line-height: `1.2` | Letter-spacing: `0em` | Font-weight: `400`
* **`label-md`**: `Hanken Grotesk` — `10px` | Line-height: `1` | Letter-spacing: `0.2em` | Font-weight: `500`
* **`body-lg`**: `Hanken Grotesk` — `16px` | Line-height: `1.6` | Font-weight: `400`

---

## 2. Visual Restraints & Editorial Policy

To enforce high-end luxury execution, we follow these non-negotiable guidelines:

1. **100% Garment Color Accuracy:** Never apply grayscale filters or desaturating transitions (`grayscale hover:grayscale-0`) on product images. Imagery must show true fabric tones and natural lighting.
2. **Zero Gradients or Shadows:** Campaign photos and product blocks must not use overlay shadows or linear black gradients (`bg-gradient-to-t from-black/20`). Text overlay readability must rely strictly on high-contrast placement against solid backgrounds or clean daylight imagery.
3. **No Placeholders:** All UI demonstrations and production builds must reference working media paths rather than blank placeholder gray boxes.
4. **Hairline Boundaries:** Grids and dividers must use a strict `1px` primary-colored boundary distribution (e.g., using `gap-gutter bg-primary` or `divide-x divide-primary` with background alignment).

---

## 3. Core Component blueprints

### A. Top Navigation Header (`TopNavBar`)

* **Background:** Solid `#ffffff` (removes visual split on scrolling).
* **Border:** Thin bottom border in `#000000` (`border-b border-primary`).
* **Layout:** Fixed at viewport top. Left navigation links, center displays logo, right contains utility icons (Search, Cart).
* **Typography:** `font-label-lg tracking-[0.15em] uppercase`.

### B. Editorial Campaign Hero (`Hero`)

* **Layout:** `h-[85vh]` large display block.
* **Overlays:** Clean, no gradients. Text sits overlayed near the bottom using high contrast.
* **Micro-interactions:** Subtle image zoom (`group-hover:scale-105`) with transition durations of `700ms` for a calm, editorial feel.

### C. Asymmetrical Architectural Grid (`AsymmetricalGrid` Block)

* **Structure:** A split 2-column container utilizing a `1px` gutter spacing (`bg-primary gap-gutter`).
  * **Col 1 (Large Image):** Full `aspect-[3/4]` image container displaying structural details, caption metadata label (`label-md`), title, and a linked text element.
  * **Col 2 (Split Content):** Top row contains a layout description (editorial text block) and bottom row contains an `aspect-video` detail image.
* **Payload Block Schema:** Needs to represent these dynamic relations (Title, Subtitle, CTA details, Images, and product handles mapping to Vendure catalogs).

### D. Hairline Divided Product Rows (`FeaturedProducts` Block)

* **Structure:** A 4-column dynamic grid divided by `1px` borders (`divide-x divide-primary`).
  * Each card has a strict `aspect-[4/5]` image container.
  * Details below: Name (`label-lg`) left, Variant/Color (`label-md`) left-subtext, Price (`body-md`) aligned right.
  * NO grayscale hover effects allowed. Garment colors must be 100% accurate.

### E. Manifesto Brand Narrative

* **Layout:** Centered block with spacious padding.
* **Typography:** Large serif display (`EB Garamond`) showcasing the brand philosophy, separated by a thin horizontal separator (`w-20 h-px bg-primary`).

---

## 4. Platform Schemas & Data Contracts

### A. Payload CMS Integration

A new Payload block element `AsymmetricalGrid` must be structured inside the Payload schema with the following fields:

* **`title`**: String (heading)
* **`subtitle`**: String (uppercase label)
* **`mediaLarge`**: Image URL or media relation (Aspect Ratio 3/4)
* **`mediaSmall`**: Image URL or media relation (Aspect Ratio Video)
* **`textBlock`**: Rich text or markdown description
* **`targetHandle`**: Vendure product/collection slug for mapping links.

### B. Catalog Alignment

* Variant names (colorways, finishes) must be seeded with clean, uppercase typography labels (e.g. `SAND/BLACK`, `OFF-WHITE`) matching metadata schemas.
* Variant displays will map directly to layout fields inside dynamic product detail views.
