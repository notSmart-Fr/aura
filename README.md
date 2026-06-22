# Aura: High-Performance Agent-Native Commerce Sandbox

Aura is a transaction-safe, type-safe, and token-efficient headless commerce storefront built on a unified GraphQL commerce API and an autonomous AI agent orchestration loop.

---

## 📐 System Architecture

This project is a standalone enterprise-grade e-commerce stack integrating:

- **Framework Layer:** Remix Vite Engine (unified server-to-browser execution and type safety).
- **AI Agent Orchestration:** Mastra Core (autonomous ReAct agent loops and structured tools).
- **Commerce Engine:** Vendure Headless GraphQL Commerce Core.
- **Database Layer:** Neon Postgres with `pgvector` for catalog embeddings and semantic search.

For detailed folder locality structures, refer to [data domain layouts](file:///i:/aura/agents.md).

---

## 🛠️ Operational Workflow (Passive Verification Loop)

To prevent execution hangs and terminal blocking during agent-driven development, the codebase utilizes a **Passive Verification Gateway**:

1. **Development Watcher**: A background file watcher runs locally in the interactive IDE terminal:

   ```bash
   pnpm verify-agent
   ```

2. **On-Save Compilation Sweep**: When a domain file or worker script is modified and saved, `chokidar-cli` captures the save event and triggers the compiler firewall (`scripts/ast-firewall.ts`) on the updated file.
3. **Out-of-Band State Gate**: The sweep compiles results and writes them to [`.gate-results.json`](file:///i:/aura/.gate-results.json).
4. **Agent Accountable Integrity**: The agent reads the timestamp and status directly from `.gate-results.json` to verify compilation and guardrail compliance before finalizing any task.

---

## 🧠 Core Architectural Concepts

To keep the repository clean and optimized, low-level technical specifications and diagrams are moved into the `.knowledge/` directory:

### 1. [AST Compiler Firewall Rules](file:///i:/aura/.knowledge/architecture/security-firewall.md)
Detailed list of the 19 compile-time rules enforced statically on save (e.g. GraphQL client isolation, process.env restrictions, telemetry anonymization, and type safety constraints).

### 2. [Background Worker Caching & Hydration](file:///i:/aura/.knowledge/architecture/caching-hydration.md)
Documents the out-of-band queue processing pipeline, Kysely vector similarity search, and pg Pool volatile context hydration logic.

### 3. [Webhook & Redis Pub/Sub Outbound Dispatch](file:///i:/aura/.knowledge/architecture/webhook-pubsub.md)
Covers the Remix webhook handler, event parsing schema gates, and outbound message dispatch via Redis Pub/Sub channels.

---

## 🚀 Quick Start (Local Setup)

To spin up development servers:

```bash
# Install dependencies
pnpm install

# Start compiler guardrails watcher (required)
pnpm verify-agent

# Start apps in monorepo (backend & storefront)
pnpm dev
```
