<!-- markdownlint-disable MD033 MD041 -->
<h1 align="center">✦ Aura E-Commerce Storefront</h1>

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

## 🎯 Project Overview & Engineering Scope

**Aura** is a highly specialized headless commerce prototype developed to showcase production-grade **Retrieval-Augmented Generation (RAG)** and **AI backend engineering** using an agentic development workflow.

Rather than duplicating standard, boilerplate e-commerce storefront features, this repository is deliberately scoped to isolate and demonstrate three core architectural pillars:

1. **Sub-Second Semantic Vector Search Engine** via `gemini-embedding-2` and a Neon PostgreSQL `pgvector` HNSW index.
2. **Context-Aware AI Visual Concierge Support Agent** parsing incoming infrastructure headers (`x-user-role`, `x-active-items`) natively.
3. **Automated Structural Security Guardrails** utilizing custom compile-time AST firewalls to regulate agentic code generation.

The entire presentation and backend routing layout were orchestrated within the **Google Antigravity IDE** using an independent **Cross-Model Verification Loop** to separate technical planning from code execution.

> 💡 **Repository Note:** The commerce baseline uses the official Medusa DTC Starter to manage background data states (Carts, Regions). Standard user-facing utility pages that do not interact with the RAG tier or AI components are omitted to keep the engineering narrative entirely focused on AI systems infrastructure.

---

## 🏗️ The Aura Architecture: Payload + Medusa

To move away from rigid, hardcoded frontend pages, this project introduces a **Slot-Based Component Registry** within a modern frontend stack of **Next.js (App Router)**, **TypeScript**, and **Tailwind CSS**.

```text
       [ Next.js App Router Storefront (React, TS, Tailwind) ]
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
            [ Medusa v2 API ]          [ Payload CMS v3 ]
            (Commerce Modules Engine)  (Dynamic Slot Layout Blocks)
              - Cart & Checkout          - Hero Block (`hero`)
              - Regions & Tax Rates      - Product Grid (`productGrid`)
              - Manifesto (`manifesto`)

```

* **Dynamic Composition:** The homepage queries Payload's `pages` collection for the `home` slug, dynamically mapping layout blocks to isolated React leaf components inside `src/modules/`.
* **Strict Separation of Data (Rule A):** Transactional data flows exclusively through the Medusa JS SDK, while editorial marketing content layout is served via Payload CMS, keeping mutations and presentations decoupled.

---

## 🛡️ Custom Compile-Time AST Guardrails

To prevent architectural drift and security vulnerabilities across a modular stack, this workspace enforces 9 custom AST-based ESLint v9 firewall rules:

```text
                   ┌─────────────────────────────────────────┐
                   │   ESLint v9 AST Compile-Time Firewall   │
                   └─────────────────────────────────────────┘
        Rule 1: Commerce Decoupling | Rule 2: CMS Access Gate
        Rule 3: Secure Server Actions| Rule 4: Idempotent Webhooks
        Rule 5: Concurrency Gate     | Rule 6: Debounced Input Gate
        Rule 7: Context Drift Filter | Rule 8: Context Exposure Gate
        Rule 9: Memory Overhead Guard
```

* **Rule 1: Commerce Decoupling:** Next.js frontend components must never import direct Medusa database handlers or SQL/ORM abstraction clients (such as imports referencing `/db/medusa`). All commerce queries and mutations must flow strictly through the Medusa service API client wrapper.
* **Rule 2: Secure Access Control Gate (Payload CMS):** You are strictly forbidden from assigning Payload CMS access control rules directly to `true` or to anonymous arrow functions that return `true`. You must implement explicit, authenticated session or user identity checks.
* **Rule 3: Secure Server Actions (Payload CMS):** In Payload 3.0's native Next.js architecture, Server Actions are exposed HTTP vectors. We must mechanically block any agent or developer from writing blind server action mutations that do not validate the active user's session context. Files utilizing the `use server` directive that execute database mutations must explicitly reference a `session`, `auth`, or `user` variable.
* **Rule 4: Secure Data Synchronization Webhooks (Idempotency):** Asynchronous data synchronization and incoming webhook handlers (exporting `POST`) performing database or store mutations must explicitly handle an `idempotency`, `signature`, `eventId`, or `nonce` variable to guard against network race conditions, event replay attacks, and data drift.
* **Rule 5: Throttled Batch Embeddings (Concurrency Gate):** To protect external embedding model APIs from rate limits, developers and agents are prohibited from wrapping an unthrottled array mapping function directly inside a `Promise.all` execution chain. You must implement a batching or chunking mechanism.
* **Rule 6: Debounced Input Gate:** Prevents direct binding of raw `onChange` listeners to `<input>` fields without debouncing, Controlled state, or a value attribute, avoiding search query floods.
* **Rule 7: Context Drift Firewall:** Ensures any endpoint invoking `streamText` passes the output through the `validateAndFilterOutput` sanitization filter to mitigate refund/context drift exploits.
* **Rule 8: Context Exposure Gate:** Blocks files utilizing Gemini AI primitives from directly accessing `process.env`. Configuration values must be routed through a secure, isolated config module.
* **Rule 9: Memory Window Overhead Guard:** Restricts passing un-pruned database identifiers (like `id`, `_id`, `product_id`) directly into tracking or telemetry functions (`track`, `logContext`, `trackEvent`). Data must be explicitly pruned or mapped beforehand.

---

## 🔍 AI & Search Tier Pipeline

Aura implements a sub-second semantic search pipeline alongside an AI Visual Concierge.

### 1. Vector Search Architecture

```text
  ┌────────────────────────────────────────────────────────────────────────┐
  │                      AUTOMATED INGESTION ENGINE                        │
  └────────────────────────────────────────────────────────────────────────┘
    [Medusa/Payload Mutations] ──► [Idempotent Webhook Route Handler]
                                                   │
                                                   ▼
                                         [Throttled Batch Engine]
                                                   │
                                                   ▼
                                       [Gemini Embedding 2 API]
                                                   │
                                                   ▼
  ┌────────────────────────────────────────────────────────────────────────┐
  │                         DATA & RETRIEVAL TIER                          │
  └────────────────────────────────────────────────────────────────────────┘
                                    [Neon PostgreSQL]
                             (pgvector + HNSW Graph Index)
                                       ▲       │
                       Query Vector    │       │  Matched Products (ms)
                      (<=> Cosine Dist)│       ▼
                               [Public Search API Endpoint]
```

* **Embedding Layer:** `gemini-embedding-2` truncated to `1,536` dimensions using Matryoshka Representation Learning to optimize PostgreSQL's HNSW index constraints.
* **Database Engine:** Neon PostgreSQL utilizing `pgvector` with Cosine distance indexing (`<=>`).

### 2. AI Visual Concierge (Support Chat)

```text
                  ┌─────────────────────────────────────────┐
                  │      Incoming Customer Request Chat     │
                  └─────────────────────────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │    DYNAMIC PREPROCESSOR CONTEXT LAYER   │
                  └─────────────────────────────────────────┘
                    Reads headers (x-user-role, x-live-session-items)
                                       │
                    ├─► [Variation A: Anonymous / Cold Start]
                    ├─► [Variation B: Active Guest Signals]
                    └─► [Variation C: Logged-in Customer History]
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │      SLIDING WINDOW CONTEXT PRUNING     │
                  └─────────────────────────────────────────┘
                    Keeps last 10 messages (starts on user role)
                    Prevents token bloat while preserving turns
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │      GEMINI 2.5 INFRASTRUCTURE TIER     │
                  └─────────────────────────────────────────┘
                    Executes streamText with Zero-Trust Prompt
                                       │
                (Tool Invocations)     │     (Streaming Token Stream)
                 ┌─────────────────────┴───────────────┐
                 ▼                                     ▼
      ┌────────────────────┐                 ┌────────────────────┐
      │   TOOL EXECUTION   │                 │  OUTPUT GENERATOR  │
      └────────────────────┘                 └────────────────────┘
       ├─► [IdObfuscator]                     ├─► [Drift Firewall]
       │   Translates real/opaque IDs         │   validateAndFilterOutput
       │                                      │
       └─► [HardRestraints]                   ▼
           Clamps query price <= $500        ┌────────────────────┐
           Clamps cart add qty <= 5          │ Secure Chat Stream │
                                             └────────────────────┘
```

* **Dynamic Preprocessor:** Reads `x-user-role`, `x-session-id`, and `x-active-items` headers to cleanly map context to specific system prompt variations (Anonymous, Recognized Guest, or Logged-in Customer).
* **Luxury Brand Restraints:** Implements aspect-locked (`aspect-[3/4]`), zero-border-radius (`rounded-none`) image containers with strict color-preserving scaling transitions to respect high-end visual aesthetics.

---

## 📦 Medusa Core Features (Baseline Engine)

Aura inherits and retains the complete headless engine provided by the upstream Medusa DTC Starter codebase:

* **Commerce Modules:** Multi-region scaling, automatic localized country/currency detection, and tax calculations.
* **Checkout & Cart:** Advanced promotional code validation, multi-step secure shipping paths, and modular payment entryways.
* **Customer Accounts:** Native address book management, persistent cart states, and historical order transfer tracking.

---

## 🤖 Development Infrastructure & Dual-Model Workflow

This repository was developed entirely through an agentic workflow within the **Google Antigravity IDE**, utilizing a strict, decoupled **Cross-Model Verification Loop** to completely separate initial code generation from architectural validation.

```text
 ┌───────────────────────────┐
 │   Google Antigravity IDE  │ ──► Generates initial implementation plan &
 │    (Workspace Context)    │     scaffolds local atomic presentation leaf nodes
 └───────────────────────────┘
               │
               ▼ (Exported Code/Blueprint)
 ┌───────────────────────────┐
 │  Isolated Chat Platform   │ ──► Acts as Independent Senior Peer Reviewer
 │   (Architectural Critique)│     Stress-tests logic and exposes hidden edge cases
 └───────────────────────────┘
               │
               ▼ (Refined & Approved Plan)
 ┌───────────────────────────┐
 │   Local Compile-Time      │ ──► Custom ESLint v9 AST Firewalls (Rules 1-9)
 │     AST Guardrails        │     mechanically enforce zero-trust data isolation
 └───────────────────────────┘
```

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

1. **Environment Synchronization:**

```bash
   cp apps/backend/.env.template apps/backend/.env
   cp apps/storefront/.env.template apps/storefront/.env.local
```

*Configure your local database target URL strings inside `apps/backend/.env`.*

1. **Database Setup & Local Seeding:**

```bash
   # Execute migrations and seed users directly from the root workspace
   pnpm --filter=@dtc/backend medusa db:migrate
   pnpm --filter=@dtc/backend medusa user -e admin@test.com -p supersecret
```

1. **Boot the Workspace Engine:**

```bash
   # From the root workspace directory
   pnpm dev
```

* Storefront Endpoint: `http://localhost:8000`
* Medusa Admin Endpoint: `http://localhost:9000/app`
* Payload CMS Admin Endpoint: `http://localhost:8000/admin`

### Verification Test Execution

To verify the AI concierge, hard restraints, vector pipeline, and database queries:

**On Windows (PowerShell):**

```powershell
cd apps/storefront
.\src\tests\run-tests.ps1
```

**On macOS / Linux (Bash):**

```bash
cd apps/storefront
bash src/tests/run-tests.sh
```

---

## 🛠️ Monorepo Troubleshooting

### ESLint v9 Flat Config Configuration Workarounds

During the addition of our AST firewalls, the workspace was migrated to `eslint.config.mjs` flat setups. Note these resolution steps if you encounter local build errors:

* **Next.js CLI Target Error:** Avoid running the wrapper-level lint tasks which treat commands as target paths. Execute the direct binary check inside the directory using `cd apps/storefront && npx eslint .`.
* **Strict Workspace Isolation:** Due to strict pnpm module caching, `@eslint/eslintrc` must be explicitly listed under local storefront `devDependencies` to allow legacy configs to bridge smoothly with the modern flat system.
