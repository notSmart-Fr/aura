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

Architecture documentation is consolidated in `.knowledge/`:

- **[Architecture Overview](.knowledge/README.md)** — system diagram, message flow, RAG pipeline, conventions, AST firewall rules
- **[Demo Runbook](.knowledge/runbook.md)** — full local startup guide (Postgres, Redis, Jaeger, all channels)
- **[Demo Guide](.knowledge/demo-guide.md)** — interview demo scenarios (Graph RAG, WhatsApp, Voice)

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

**Full demo (all channels + telemetry):** see [Demo Runbook](.knowledge/runbook.md) — Postgres, Redis, Jaeger, worker, voice agent, and step-by-step test scenarios.
