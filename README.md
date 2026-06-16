<!-- markdownlint-disable MD033 MD041 -->
<p align="center">
  <img alt="Aura Logo" src="https://user-images.githubusercontent.com/59018053/229103275-b5e482bb-4601-46e6-8142-244f531cebdb.svg" width="120" />
</p>

<h1 align="center">Aura E-Commerce Storefront</h1>

<p align="center">
  <strong>An Advanced Luxury Apparel Monorepo Extension</strong><br />
  Built on top of the official <strong>Medusa DTC Starter</strong>, integrated with <strong>Payload CMS (v3)</strong> and <strong>Next.js (App Router)</strong>.
</p>

<p align="center">
  <a href="#-the-aura-architecture-payload--medusa">Aura Architecture</a> •
  <a href="#-custom-compile-time-ast-guardrails">AST Guardrails</a> •
  <a href="#-ai--search-tier-pipeline">AI & Search Tier</a> •
  <a href="#-medusa-core-features">Base Medusa Features</a> •
  <a href="#-getting-started">Local Setup</a>
</p>

---

## 🎯 Project Overview
**Aura** elevates the standard Medusa commerce template into a high-end, production-grade digital flagship store. By introducing a slot-based content management engine via Payload CMS and building deep AI-driven search and concierge layers, this repository demonstrates how to scale headless commerce while maintaining zero-trust code security.

> 💡 **Repository Note:** This project is a heavily extended monorepo fork of the standard Medusa DTC Starter. The baseline commerce modules remain intact, while the presentation, content orchestration, and linting/security engines have been completely re-architected.

---

## 🏗️ The Aura Architecture: Payload + Medusa

To move away from rigid, hardcoded frontend pages, this project introduces a **Slot-Based Component Registry**.

```text
       [ Next.js App Router Storefront ]
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
[ Medusa v2 API ]          [ Payload CMS v3 ]
(Commerce Modules Engine)  (Dynamic Slot Layout Blocks)
  - Cart & Checkout          - Hero Block (`hero`)
  - Regions & Tax Rates      - Product Grid (`productGrid`)
  - Order Lifecycles         - Manifesto (`manifesto`)

```

* **Dynamic Composition:** The homepage queries Payload's `pages` collection for the `home` slug, dynamically mapping layout blocks to isolated React leaf components inside `src/modules/`.
* **Strict Separation of Data (Rule A):** Transactional data flows exclusively through the Medusa JS SDK, while editorial marketing content layout is served via Payload CMS, keeping mutations and presentations decoupled.

---

## 🛡️ Custom Compile-Time AST Guardrails

To prevent architectural drift and security vulnerabilities across a modular stack, this workspace enforces 9 custom AST-based ESLint v9 firewall rules:

* **Commerce Decoupling (Rule 1):** Prevents frontend components from directly importing backend Medusa handlers. All interactions must use the public service client wrapper.
* **Context Drift Firewall (Rule 7):** Outbound AI text generation hooks invoking Gemini's `streamText` must pipe chunks through `validateAndFilterOutput` to mitigate injection exploits.
* **Idempotent Webhooks (Rule 4):** Webhook endpoints capturing Medusa or Payload events must validate incoming headers against an explicit `idempotency`, `signature`, or `nonce` variable to guard against replay attacks.
* **Memory Overhead Guard (Rule 9):** Blocks raw database keys (e.g., `_id`, `product_id`) from being passed directly into un-pruned telemetry log loops.

---

## 🔍 AI & Search Tier Pipeline

Aura implements a sub-second semantic search pipeline alongside an AI Visual Concierge.

### 1. Vector Search Architecture

* **Embedding Layer:** `gemini-embedding-2` truncated to `1,536` dimensions using Matryoshka Representation Learning to optimize PostgreSQL's HNSW index constraints.
* **Database Engine:** Neon PostgreSQL utilizing `pgvector` with Cosine distance indexing (`<=>`).

### 2. AI Visual Concierge (Support Chat)

* **Dynamic Preprocessor:** Reads `x-user-role`, `x-session-id`, and `x-active-items` headers to cleanly map context to specific system prompt variations (Anonymous, Recognized Guest, or Logged-in Customer).
* **Luxury Brand Restraints:** Implements aspect-locked (`aspect-[3/4]`), zero-border-radius (`rounded-none`) image containers with strict color-preserving scaling transitions to respect high-end visual aesthetics.

---

## 📦 Medusa Core Features (Baseline Engine)

Aura inherits and retains the complete headless engine provided by the upstream Medusa DTC Starter codebase:

* **Commerce Modules:** Multi-region scaling, automatic localized country/currency detection, and tax calculations.
* **Checkout & Cart:** Advanced promotional code validation, multi-step secure shipping paths, and modular payment entryways.
* **Customer Accounts:** Native address book management, persistent cart states, and historical order transfer tracking.

---

## 🚀 Getting Started

### Prerequisites

* Node.js v20+ | PostgreSQL v15+ | pnpm v10+

### Quick Start Execution

1. **Install Dependencies:**

```bash
   git clone https://github.com/your-username/aura-storefront.git
   cd aura-storefront
   pnpm install
```

2. **Environment Synchronization:**

```bash
   cp apps/backend/.env.template apps/backend/.env
   cp apps/storefront/.env.template apps/storefront/.env.local
```

*Configure your local database target URL strings inside `apps/backend/.env`.*

3. **Database Setup & Local Seeding:**

```bash
   cd apps/backend
   pnpm medusa db:migrate
   pnpm medusa user -e admin@test.com -p supersecret
```

4. **Boot the Workspace Engine:**

```bash
   # From the root workspace directory
   pnpm dev
```

* Storefront Endpoint: `http://localhost:8000`
* Medusa Admin Endpoint: `http://localhost:9000/app`
* Payload CMS Admin Endpoint: `http://localhost:8000/admin`

---

## 🛠️ Monorepo Troubleshooting

### ESLint v9 Flat Config Configuration Workarounds

During the addition of our AST firewalls, the workspace was migrated to `eslint.config.mjs` flat setups. Note these resolution steps if you encounter local build errors:

* **Next.js CLI Target Error:** Avoid running the wrapper-level lint tasks which treat commands as target paths. Execute the direct binary check inside the directory using `cd apps/storefront && npx eslint .`.
* **Strict Workspace Isolation:** Due to strict pnpm module caching, `@eslint/eslintrc` must be explicitly listed under local storefront `devDependencies` to allow legacy configs to bridge smoothly with the modern flat system.
