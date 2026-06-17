<!-- markdownlint-disable MD033 -->
# Aura: High-Performance Agent-Native Commerce Sandbox

This repository isolates and demonstrates our core architectural pillars across two distinct development phases. Click the dropdown accordions below to explore the technical case studies, system metrics, and static analysis configurations for each ecosystem.

---

## 🛠️ Select System Architecture Version

<details>
<summary><b>📐 PHASE 1: Distributed Prototype (Next.js + Medusa V2 + Payload CMS)</b></summary>

### Phase 1 System Architecture Overview

This phase explores the loose integration of a fragmented full-stack setup, focusing on multi-hop asynchronous ingestion engines, distributed transaction hooks, and custom token-slicing window middleware.

* **Framework Layer:** Next.js App Router (Client-Side State Slicing)
* **Commerce Foundation:** Medusa V2 REST Core + Payload CMS
* **Full Case Study Documentation:** [View Phase 1 Deep-Dive File](./README.phase1-medusa.md)

</details>

<details open>
<summary><b>🚀 PHASE 2: Enterprise Graph Stack (Remix + Mastra Core + Vendure Backend) [CURRENT]</b></summary>

### Phase 2 System Architecture Overview

This phase collapses our core components down into an integrated, transaction-safe, token-efficient data graph. All business rules and inventory operations are isolated behind a unified GraphQL gateway, utilizing Remix server gates to enforce strict type-safe execution loops.

* **Framework Layer:** Remix Vite Engine (Unified Server-to-Browser Type Loops)
* **AI Orchestration:** Mastra Tools + DeepSeek-V3 Engine
* **Commerce Foundation:** Vendure Headless GraphQL Core (TypeORM + Neon Postgres `pgvector`)
* **AST Security:** Custom build-time compiler firewalls targeting isolated tool schema definitions.
* **Full Case Study Documentation:** [View Phase 2 Deep-Dive File](./README.phase2-remix.md)

### Quick Start (Current Stack)

```bash
pnpm install
cd apps/backend && pnpm run dev
cd ../storefront && pnpm run dev
```

</details>
