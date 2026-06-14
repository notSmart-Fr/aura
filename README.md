<!-- markdownlint-disable MD033 MD041 -->
<p align="center">
  <a href="https://www.medusajs.com">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/59018053/229103275-b5e482bb-4601-46e6-8142-244f531cebdb.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://user-images.githubusercontent.com/59018053/229103726-e5b529a3-9b3f-4970-8a1f-c6af37f087bf.svg">
    <img alt="Medusa logo" src="https://user-images.githubusercontent.com/59018053/229103726-e5b529a3-9b3f-4970-8a1f-c6af37f087bf.svg">
    </picture>
  </a>
</p>
<h1 align="center">
  Medusa DTC Starter
</h1>

<h4 align="center">
  <a href="https://docs.medusajs.com">Documentation</a> |
  <a href="https://www.medusajs.com">Website</a>
</h4>

<p align="center">
  Building blocks for digital commerce
</p>
<p align="center">
  <a href="https://github.com/medusajs/medusa/blob/develop/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="Medusa is released under the MIT license." />
  </a>
  <a href="https://circleci.com/gh/medusajs/medusa">
    <img src="https://circleci.com/gh/medusajs/medusa.svg?style=shield" alt="Current CircleCI build status." />
  </a>
  <a href="https://github.com/medusajs/medusa/blob/develop/CONTRIBUTING.md">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat" alt="PRs welcome!" />
  </a>
    <a href="https://www.producthunt.com/posts/medusa"><img src="https://img.shields.io/badge/Product%20Hunt-%231%20Product%20of%20the%20Day-%23DA552E" alt="Product Hunt"></a>
  <a href="https://discord.gg/xpCwq3Kfn8">
    <img src="https://img.shields.io/badge/chat-on%20discord-7289DA.svg" alt="Discord Chat" />
  </a>
  <a href="https://twitter.com/intent/follow?screen_name=medusajs">
    <img src="https://img.shields.io/twitter/follow/medusajs.svg?label=Follow%20@medusajs" alt="Follow @medusajs" />
  </a>
</p>

# Medusa DTC Starter

A production-ready monorepo starter for direct-to-consumer ecommerce stores powered by Medusa and Next.js. Includes a fully featured storefront with product browsing, cart, checkout, customer accounts, and order management.

# Aura E-Commerce Storefront

This repository implements a high-end minimalist apparel storefront using Next.js (App Router), Medusa v2 (Headless Commerce), and Payload CMS (Co-located Content Engine).

## Deterministic Architectural Contract

All frontend contributions and AI coding agents must adhere to the rules outlined in [agent.md](file:///i:/Easytech/agent.md) (or [agents.md](file:///i:/Easytech/agents.md) / [AGENTS.md](file:///i:/Easytech/AGENTS.md)), workspace rules in [.agents/rules/deterministic_contract.md](file:///i:/Easytech/.agents/rules/deterministic_contract.md), and the agent/developer guidelines below.

### 1. Visual Restraints & Styling Tokens

- **Aesthetic:** Minimalist, luxury typography and layouts (e.g., Hugo Boss style).
- **Color Palette:** White/Off-white backgrounds (`bg-white`, `bg-zinc-50`), sharp dark charcoal/slate/black headers (`text-zinc-900`, `text-slate-900`). No neon colors, heavy borders, or glowing gradients.
- **Borders:** Strict minimal borders (`border-zinc-200`) and sharp corners (`rounded-none` or `rounded-sm` max).
- **Aspect Ratios:** Apparel imagery containers must use fixed aspect ratios (`aspect-[3/4]` or `aspect-square`) with a fallback neutral loading state (`bg-zinc-100`).

### 2. File Management & Locality

Keep all layout components, templates, and micro UI atomic leaf nodes localized inside their boundary lanes in `src/modules/`. Do not leak routing orchestration parameters or rendering markup inappropriately.

Refer to [agent.md](file:///i:/Easytech/agent.md) for the locked directory structures.

### 3. Core Integration Rules

- **Rule A (Separation of Data):** Fetch transactional product parameters via the official Medusa JS SDK and content layouts using Payload CMS.
- **Rule B (Strict Type Contracts):** Consume official types exported by `@medusajs/types` or `HttpTypes.StoreProduct`. Do not use `any`.
- **Rule C (Context Containment):** Work locally within atomic leaf folders when editing components. Do not modify parent configurations.
- **Rule D (Data State Mutability):** Do not write custom `fetch()` or Axios setups for commerce endpoints; rely on the global SDK handler.

## Features

- All of [Medusa's commerce features](https://docs.medusajs.com/resources/commerce-modules)
- Multi-region support with automatic country detection
- Product catalog with variant selection
- Cart with promotion codes
- Multi-step checkout with shipping and payment
- Customer accounts with order history and address management
- Order transfer between accounts

## Getting Started

### Deploy with Medusa Cloud

The fastest way to get started is deploying with [Medusa Cloud](https://cloud.medusajs.com):

1. [Create a Medusa Cloud account](https://cloud.medusajs.com)
2. Deploy this starter directly from your dashboard

### Local Installation

> **Prerequisites:
>
> - [Node.js](https://nodejs.org/) v20+
> - [PostgreSQL](https://www.postgresql.org/) v15+
> - [pnpm](https://pnpm.io/) v10+

1. Clone the repository and install dependencies:

```bash
git clone https://github.com/medusajs/dtc-starter.git
cd dtc-starter
pnpm install
```

1. Set up environment variables for the backend:

```bash
cp apps/backend/.env.template apps/backend/.env
```

1. Set the database URL in `apps/backend.env`:

```bash
# Replace with actual database URL, make sure the database exists.
DATABASE_URL=postgres://postgres:@localhost:5432/medusa-dtc-starter
```

1. Run migrations:

```bash
cd apps/backend
pnpm medusa db:migrate
```

1. Add admin user:

```bash
cd apps/backend
pnpm medusa user -e admin@test.com -p supersecret
```

1. Start Medusa backend:

```bash
cd apps/backend
pnpm dev
```

1. Open the admin dashboard at `localhost:9000/app` and log in. Retrieve your publishable API key at Settings > Publishable API key.

2. Set up environment variables for the storefront:

```bash
cp apps/storefront/.env.template apps/storefront/.env.local
```

1. Update `apps/storefront/.env.local` with your Medusa publishable API key:

```bash
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_6c3...
```

1. Start storefront:

```bash
cd apps/storefront
pnpm dev
```

The storefront runs on `http://localhost:8000`.
You can also run the storefront and backend separately.

#### 1. From the Root Directory (Recommended)
- To run only the **Storefront**:
  ```bash
  pnpm storefront:dev
  ```
- To run only the **Backend**:
  ```bash
  pnpm backend:dev
  ```

#### 2. From the Respective Subdirectories
- For the **Storefront**:
  ```bash
  cd apps/storefront
  pnpm dev
  ```
- For the **Backend**:
  ```bash
  cd apps/backend
  pnpm dev
  ```

Alternatively, you can run the following command from the root to start both the backend and storefront concurrently:

```bash
pnpm dev
```

## Slot-Based CMS Architecture

To move away from rigid monolithic page layouts, the homepage has been refactored into a **slot-based composition architecture** powered by Payload CMS blocks.

* **Orchestration Page:** The storefront renders the homepage dynamically by querying the `pages` collection for a document with the slug `home`.
* **Component Registry:** The page layout maps incoming Payload blocks to isolated, modular React components:
  * **Hero Block (`hero`)** &rarr; `src/components/blocks/HeroBlock.tsx`
  * **Product Grid Block (`productGrid`)** &rarr; `src/components/blocks/ProductGridBlock.tsx` (populates copy from Payload and product lists dynamically from the Medusa SDK).
  * **Manifesto Block (`manifesto`)** &rarr; `src/components/blocks/ManifestoBlock.tsx`
  * **Asymmetrical Grid Block (`asymmetrical-grid`)** &rarr; `src/components/blocks/AsymmetricalGridBlock.tsx` (formerly the Teaser section).

---

## Modifying the Homepage via Payload CMS

Instead of editing isolated collections like `HeroBanners` or `Lookbooks`, all homepage blocks are managed centrally under the **Pages** collection:

### 1. Locate the Homepage Document
1. Log into your Payload CMS Admin dashboard (default: `http://localhost:8000/admin`).
2. Navigate to **Pages** in the sidebar.
3. Edit the existing page with the slug **`home`** (or create a new page and set the Title to `Home` and the Slug exactly to `home`).

### 2. Compose the Layout (Drag and Drop Blocks)
Under the **Layout** section of the `home` document:
* **Add Blocks:** Click the **Add Layout** button to append new blocks (e.g. *Hero Block*, *Product Grid*, *Asymmetrical Grid*).
* **Reorder Blocks:** Drag and drop blocks to rearrange the rendering sequence on the storefront.
* **Delete Blocks:** Click the **Remove** (X) icon on any block card.
* **Fill out Block Fields:**
  * Ensure all required fields (like the *Image* inside a *Hero Block* or *imageUrl* and *targetHandle* in an *Asymmetrical Grid*) are completed before saving, or Payload will return validation errors (`400 Bad Request`).

### 3. Save and Purge Cache
* Click **Save** or **Publish** at the top right of the editor.
* Refresh your storefront page (`http://localhost:8000/`) to view the changes instantly.

---

## Architectural Notes (Local DB Synchronization)

In local development, Payload's automated `db push` is configured to `push: false` inside `payload.config.ts`. This prevents database startups from throwing drop-constraint transaction locks on PostgreSQL schemas. Legacy database tables (like `hero_banners` and `lookbooks`) are preserved but hidden (`hidden: true`) from the Admin Panel sidebar to avoid data loss.

## Resources

- [Medusa Documentation](https://docs.medusajs.com)
- [Medusa Cloud](https://cloud.medusajs.com)

Medusa Admin: [EMAIL_ADDRESS]
Password: [PASSWORD ]

Next.js Storefront: <http://localhost:8000>
Medusa Admin: <http://localhost:9000/app>

## Administrative Entryways (Dashboard Shortcuts)

We have integrated convenient shortcuts to access the admin dashboards directly from the storefront:

### 1. Payload CMS Admin Dashboard (`/admin`)
- **Global Keyboard Shortcut:** Press `Alt + Shift + A` (or `Ctrl + Shift + A`) on any storefront page to automatically open the Payload CMS Admin dashboard in a new tab.
- **Dynamic Navigation Link:** When logged in as an admin (`user.role === 'admin'`), a `"✦ DASHBOARD"` text link is displayed on the right side of the navigation bar that opens the Payload CMS Admin dashboard in a new tab.
- **Direct Link:** Directly accessible at `http://localhost:8000/admin`.

### 2. Medusa Admin Dashboard (`/app` on Backend)
- **Global Keyboard Shortcut:** Press `Alt + Shift + M` (or `Ctrl + Shift + M`) on any storefront page to automatically open the Medusa Admin dashboard (`http://localhost:9000/app`) in a new tab.
- **Direct Link:** Directly accessible at `http://localhost:9000/app`.




