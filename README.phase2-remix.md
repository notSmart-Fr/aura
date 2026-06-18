# Implementation Plan: Strict AST Security Layout Guidelines (Phase 2)

This implementation plan details our conformance strategy and operational plan for aligning the Remix + Mastra + Vendure codebase with strict AST compiler firewalls and Level 3 structural determinism rules.

## ⚠️ User Review Required

> [!IMPORTANT]
> To comply with the AST Security Layout Guidelines, all subsequent code generation and modification tasks must adhere strictly to the rules below. Specifically, **all Mastra tools must define their schemas in standalone, exported constants ending with the suffix `Schema`**, with strict constraints applied (`.min()` and `.max()` for numbers; `.max()` for strings) to allow atomic build-time validation.

---

## 📐 Proposed Layout Paradigms & Implementation Strategy

### 1. GraphQL Client Isolation Gate

- **Rule:** Frontend routes (`apps/storefront/app/routes/**/*.tsx`) must not import backend modules, raw database drivers, or NestJS injections.
- **Action:** All data operations will flow strictly through our central GraphQL client abstraction located at `~/lib/graphql-client` or through Mastra orchestration tools.

### 2. Unbound Agent Parameter Gate (Mastra Tools)

- **Rule:** Tools inside `apps/storefront/app/mastra/tools/` must not use inline, unconstrained schema definitions.
- **Action:** Extract all inputs into a standalone, exported constant variable ending with the text `Schema` (e.g., `export const SearchCatalogInputSchema = z.object({ ... })`). The naming convention must exactly follow camelCase configurations matching the input tool signatures.
- **Validation Constraints:** Ensure `.max()` is explicitly declared for strings and `.min()` / `.max()` are set for numbers.

### 3. Unauthenticated Remix Action Gate

- **Rule:** Every HTTP POST/PUT action must perform session validation.
- **Action:** Every `action` function exported inside `app/routes/` must explicitly execute session checks or authenticate user access using unified helper closures (such as `authenticateUser`, `session`, or checking `x-user-role`).

### 4. Webhook Signature Verification Gate

- **Rule:** Protect sync endpoints from event replay/spoofing attacks.
- **Action:** The webhook handler in `apps/storefront/app/routes/api.webhook.tsx` must explicitly check the signature retrieved via `request.headers.get('x-vendure-signature')`.

### 5. Mastra Workflow Concurrency Gate

- **Rule:** Protect model APIs from rate limits.
- **Action:** Do not use plain, unthrottled `Promise.all(array.map(...))` when executing Gemini AI client requests or embedding runs. Implement a batching/chunking helper to control concurrency.

### 6. Seamless Remix Form Validation Gate

- **Rule:** Avoid client-side search query floods and race conditions.
- **Action:** Avoid raw, un-debounced client-side `onChange` listeners firing actions. Use Remix native `<Form>` blocks or a debounced submit mechanism with `useSubmit()`.

### 7. Stream Serialization Filter (Context Drift Guard)

- **Rule:** Clean up LLM outputs before streaming.
- **Action:** Wrap outputs of Mastra `streamText` or `generateText` in `validateAndFilterOutput`.

### 8. Banned Process.Env Isolation (Context Exposure Gate)

- **Rule:** Prevent env leaks to tracking/tracing layers.
- **Action:** No direct referencing of `process.env.*` in components or tools. Use a secure mapping configuration file (`server.config.ts`).

### 9. Telemetry Anonymization Gate

- **Rule:** Prevent database hashes or sensitive properties from leaking.
- **Action:** Ensure tracking payloads passed to `trackEvent` or loggers are parsed/sanitized into safe scalar primitives first.

---

### 🔐 Level 3 Structural Determinism Addendums

- **Mastra Linear Flow Validation:** Workflows via `createWorkflow()` will use/execute pure functional composition (`.then()`, `.parallel()`, `.branch()`) without direct, imperative state mutation assignments to the running workflow state.
- **GraphQL Field Over-Fetching Limits:** Catalog query listings will request only scalar details (`id`, `name`, `slug`). Heavy descriptive data properties or asset matrices are reserved for explicit detail layouts.
- **Remix Action Validation:** Payload values from `formData.get()` will be validated with schemas (`Schema.parse(payload)`) before calling Mastra tools.
- **Isolated Safe-Context Wrapper:** Render all stream messages within `<SecureStreamContainer />` to isolate text parsing mechanics.

---

## 🛠️ Verification Plan

### Automated Build-Time Enforcement

Code verification is managed via a dedicated TypeScript AST compiler analysis script (`scripts/ast-firewall.ts`) executed at the monorepo root using Node's native `--experimental-strip-types` flag (no `ts-node` required).

```bash
# Preferred alias — runs the full AST sweep
pnpm verify-agent

# Equivalent direct call
pnpm run check:firewall
```

Both commands execute `node --no-warnings --experimental-strip-types scripts/ast-firewall.ts` and exit `0` on a clean codebase or `1` with a violation report.

**Agent mandate:** The agent must run `pnpm verify-agent` before declaring any implementation complete. Bypass comments (`// eslint-disable-next-line`) and modifications to `scripts/ast-firewall.ts` are strictly prohibited.

### Local Linter Configuration

Local ESLint configurations (e.g., `apps/storefront/eslint.config.mjs`) are stripped of architectural firewalls and reset to lightweight rules (`eslint:recommended`, `@typescript-eslint/recommended`, `react-hooks/recommended`) for local code style only. All structural enforcement lives exclusively in `scripts/ast-firewall.ts`.

---

## 🤖 Agent Architecture

### System Handbook (`AGENTS.md`)

The root `AGENTS.md` file is the agent's always-active global instruction set. It contains only high-level behavioral rules, design primitives, and the verification execution loop — keeping the active context window lean.

### On-Demand Skills (`.agent/skills/`)

Heavy, domain-specific rules are isolated into skill files that load **only when the agent's task matches the skill's `description` frontmatter field**:

| Skill | File | Activates when... |
| ----- | ---- | ----------------- |
| CSV Ingestion | `.agent/skills/csv-ingestion.md` | Writing seeders, parsing CSV files, or bulk data mutations |
| Product Topography | `.agent/skills/product-topography.md` | Creating or structuring Vendure product variants or option matrices |
| ReAct Orchestration | `.agent/skills/react-orchestration.md` | Building Mastra agents, workflows, or ReAct tool-calling loops |
| RAG Pipeline | `.agent/skills/rag-pipeline.md` | Building semantic search, vector chunking, or RAG context retrieval |

### File Locality (Data-Forward Domain Structure)

All code, types, queries, and tools for a feature are colocated in a self-contained domain leaf — never split by technical layer:

```text
apps/storefront/app/
├── routes/                               <-- Pure Routing Wire (Thin)
│   ├── _index.tsx
│   └── api.webhook.ts
└── domains/                              <-- Self-Contained Data Leaf Nodes
    ├── catalog/
    │   ├── searchCatalogTool.ts          <-- Mastra Tool
    │   ├── catalog.component.tsx         <-- Remix Presentation Layer
    │   └── catalog.queries.ts            <-- Vendure GraphQL Client Queries
    ├── cart/
    │   └── modifyCartTool.ts
    └── recommendations/
        └── showRecommendationsTool.ts
```
