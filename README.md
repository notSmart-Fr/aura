# Aura: High-Performance Agent-Native Commerce Sandbox

Aura is a transaction-safe, type-safe, and token-efficient headless commerce storefront built on a unified GraphQL commerce API and an autonomous AI agent orchestration loop.

---

## 📐 System Architecture

This project is a standalone enterprise-grade e-commerce stack integrating:

- **Framework Layer:** Remix Vite Engine (unified server-to-browser execution and type safety).
- **AI Agent Orchestration:** Mastra Core (autonomous ReAct agent loops and structured tools).
- **Commerce Engine:** Vendure Headless GraphQL Commerce Core.
- **Database Layer:** Neon Postgres with `pgvector` for catalog embeddings and semantic search.

---

## ⚡ Zero-Allocation Semantic Cache Layer

To maximize performance and eliminate redundant LLM API costs, the storefront implements a high-performance **Zero-Allocation Semantic Cache Layer** (colocated in `apps/storefront/app/domains/ai-cache/`):

- **Separation of Concerns**: Embedding generation (via local Ollama vectors) is separated from text generation/LLM loops.
- **Multi-Dimensional Vector Geometry**: Queries are converted into 384-dimension vectors and evaluated against the Neon Postgres cache using native `pgvector` cosine similarity (`<=>`).
- **Instant Miss/Hit Interception**: Repetitive and semantically close queries ($distance < 0.05$) are matched and returned directly from Neon in milliseconds, completely bypassing external LLM APIs and local compute cycles.

---

## 🛠️ Operational Workflow (Passive Verification Loop)

To prevent execution hangs and terminal blocking during agent-driven development, the codebase utilizes a **Passive Verification Gateway**:

1. **Development Watcher**: A background file watcher runs locally in the interactive IDE terminal:

   ```bash
   pnpm verify-agent
   ```

2. **On-Save Compilation Sweep**: When a domain file is modified and saved, `chokidar-cli` captures the save event and triggers the compiler firewall (`scripts/ast-firewall.ts`) on the updated file.
3. **Out-of-Band State Gate**: The sweep compiles results and writes them to [`.gate-results.json`](file:///i:/aura/.gate-results.json).
4. **Agent Accountable Integrity**: The agent reads the timestamp and status directly from `.gate-results.json` to verify compilation and guardrail compliance before finalizing any task.

---

## 🔒 AST Compiler Firewall Rules

All structural guidelines and boundaries are programmatically checked via custom static analysis (`ts-morph`) in [ast-firewall.ts](file:///i:/aura/scripts/ast-firewall.ts). The firewall evaluates fourteen structural gates:

1. **GraphQL Client Isolation**: Storefront routes are prohibited from importing backend database drivers or services directly; all data passes through the GraphQL client or Mastra tools.
2. **Unbound Mastra Tool Parameters**: Tool schemas in `app/domains/` must export input schemas ending in `Schema`, enforcing strict size constraints (`.max()` for strings, `.min()` or `.positive()` and `.max()` for numbers).
3. **Unauthenticated Remix Actions**: Every HTTP POST action in storefront routes must perform session/authentication validation.
4. **Webhook Signature Validation**: Webhook endpoints must check signature headers (`x-vendure-signature`) to protect against event replay attacks.
5. **AI Concurrency Limit**: AI embeddings and Gemini client loops must be batched/throttled instead of wrapped in plain, unthrottled `Promise.all` maps.
6. **Controlled Form Inputs**: Raw `onChange` listeners on standard `<input>` tags must have debounced/value bindings to prevent search flood vectors.
7. **Stream Sanitization**: LLM generation output must be parsed and sanitized with `validateAndFilterOutput`.
8. **Process.Env Access Block**: Direct referencing of `process.env.*` in client components or tools is forbidden to prevent context exposure leaks.
9. **Telemetry Anonymization**: Database hashes or primary identifiers must be stripped before being passed to tracking events.
10. **Banned Jsx Spreads**: Spread operators (`{...props}`) are prohibited on custom component tags to prevent implicit data exposures.
11. **AI Model Constraint**: Mastra Agents are restricted to validated models (`google/gemini-2.0-flash` or `google/gemini-2.5-flash`).
12. **Mastra Tool Metadata**: All created tools must have a precise alphanumeric `id` and a detailed description of at least 20 characters.
13. **E-commerce Security & Idempotency**:
    - State-mutating tools inside `domains/cart/` and `domains/checkout/` must include `idempotencyKey: z.string().uuid()`.
    - Quantity properties must enforce positive integer types (`.int().positive()`) and a maximum limit of `.max(99)`.
    - Direct `price` or `amount` inputs in client-facing tool schemas are strictly forbidden (prices must resolve exclusively on the backend).
14. **Storefront Network Isolation**:
    - Raw unvalidated network payloads (`fetch`, `axios`) are forbidden; all network calls must be wrapped inside a structural Zod schema validation node (e.g. `Schema.parse()`).
    - Mutating outbound network calls must explicitly declare an `'Idempotency-Key'` header assigned to a unique UUID.
15. **Ingestion Worker Normalization**: Downstream ingestion payload processors must consume strictly structured `NormalizedPayload` types.
16. **Cosine Similarity Distance Query**: Queries targeting the `cache_embeddings` semantic database table must execute similarity distance matches utilizing the native pgvector `<=>` operator.
17. **Context-Window Cache Optimization**: Tail-volatile user prompt variables must be appended at the absolute suffix of dynamic template string statements to maximize caching performance.
18. **Telemetry Data Leakage Prevention**: Tracing span attribute setters (`.setAttribute`) inside worker environments must not record keys containing sensitive terms (`phone`, `sender`, `text`, `message`).

---

## ⚡ Asynchronous Ingestion & Telemetry Pipeline

```text
[CHAOTIC DATA INPUTS]
  (WhatsApp Text, Audio, Images)
            │
            ▼
┌──────────────────────────────────────┐
│ 1. Remix API Webhook Route           │ ── (Goal 1: Instant network response)
└──────────────────────────────────────┘
            │
            ▼ [BullMQ Out-of-Band Queue]
┌──────────────────────────────────────┐
│ 2. Redis Token Bucket Limit Gate     │ ── (Goal 3: Discards spam at perimeter)
└──────────────────────────────────────┘
            │
            ▼ [Passes Rate Limit]
┌──────────────────────────────────────┐
│ 3. Multi-Modal Normalization Layer   │ ── (Goal 2: Flattens inputs to Markdown)
└──────────────────────────────────────┘
            │
            ▼ [Unified NormalizedPayload]
┌──────────────────────────────────────┐
│ 4. Neon Cloud pgvector Hot Cache     │ ── (Goal 4: 95% Match? Skips LLM entirely)
└──────────────────────────────────────┘
            │
            ▼ [Cache Miss]
┌──────────────────────────────────────┐
│ 5. Optimized Prompt Frame Block      │ ── (Goal 5: Tail-volatile context cache)
└──────────────────────────────────────┘
```

- **Distributed Telemetry:** Every single transaction through the worker pipeline emits anonymized OpenTelemetry span context traces (`rate-limiter`, `cache-lookup`) to enable centralized latency diagnostics.
- **Anonymization Guard:** The pipeline strictly prevents user-identifiable properties (e.g. phone numbers, raw message payloads) from escaping into the telemetry logging subsystem.

### 🧠 The Core Message Processing Blueprint

When an inbound job pops off the queue, the worker routes it through the following logical pipeline:

```text
                  ┌───────────────────────────────────┐
                  │       INBOUND QUEUE EVENT         │
                  │   "Do you have green linen?"      │
                  └─────────────────┬─────────────────┘
                                    │
                                    ▼
                     ┌──────────────────────────────┐
                     │   Ollama Local Embedding     │
                     │  (Generate Text Vector)      │
                     └──────────────┬───────────────┘
                                    │
                                    ▼
                     ┌──────────────────────────────┐
                     │     Neon Cloud DB Lookup     │
                     │  (Cosine Similarity Match)   │
                     └──────────────┬───────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼ Cache Hit                     ▼ Cache Miss
         ┌─────────────────────┐         ┌─────────────────────────────┐
         │  Fetch Saved Answer │         │   Trigger Gemini Pro API    │
         │   From PostgreSQL   │         │  (Inject Store Inventory)   │
         └──────────┬──────────┘         └──────────────┬──────────────┘
                    │                                   │
                    │                                   ▼
                    │                        ┌─────────────────────┐
                    │                        │ Save New Vector to  │
                    │                        │    Neon Database    │
                    │                        └──────────┬──────────┘
                    │                                   │
                    └───────────────────┬───────────────┘
                                        │
                                        ▼
                        ┌──────────────────────────────┐
                        │   Redis Pub/Sub Broadcast    │
                        │    Outbound Message Event    │
                        └──────────────────────────────┘
```

- **Vector Conversion**: The inbound text query is sent to the local Ollama embedding generator to compute its high-dimensional vector coordinates.
- **Neon Cloud DB Lookup**: An HNSW cosine similarity query is run against the Neon database using the `pgvector` operator (`<=>`) to check for semantically close historical entries.
- **Conditional Branches**:
  - **Cache Hit**: If a semantic match exists within the threshold ($distance < 0.05$), the worker retrieves the cached response immediately, bypassing LLM compute cycles entirely.
  - **Cache Miss**: The worker calls the Gemini Pro API (`shopAgent`) to generate an intelligent reply, then inserts the user's question, embedding vector, and response text back into the Neon database for future cache hits.
- **Outbound Dispatch**: The resolved response is broadcasted to the `wa_outbound` Redis Pub/Sub channel for delivery.

---

## 🌐 The Webhook Data Bridge Architecture

To connect WhatsApp events asynchronously, we implement a high-speed, non-blocking gate at `/api/webhook/whatsapp`:

```text
┌────────────────────────────────────────────────────────┐
│               REMIX WEBHOOK ROUTE (API)                │
│                                                        │
│  GET  /api/webhook/whatsapp  ──► [Verify Meta Token]   │
│                                                        │
│  POST /api/webhook/whatsapp  ──► [Validate JSON Schema] │
│                                         │              │
│                                         ▼              │
│                              [Push to BullMQ Redis]    │
│                                         │              │
│                                  (Returns 200 OK)      │
└────────────────────────────────────────────────────────┘
                                          │
                                          ▼ Out-of-Band
                               ┌───────────────────┐
                               │  worker.ts Loop   │
                               └───────────────────┘
```

### Async Operations Workflow

1. **GET Verification**: Meta verifies the webhook endpoint authenticity via standard verification token handshake checks.
2. **POST Event Ingestion**: Incoming WhatsApp JSON messages (texts, media URLs) are validated against schema boundaries, pushed to the **BullMQ Redis** queue, and the route immediately returns a `200 OK` response to Meta in milliseconds to prevent timeouts.
3. **Out-of-Band Worker processing**: The decoupled background worker process (`worker.ts`) dequeues messages asynchronously, routing them through rate-limiting, normalization, caching, and agent processing lanes.

---

## 📣 Redis Pub/Sub Outbound Dispatch Architecture

To broadcast outgoing response payloads back to customers without introducing tight file system dependencies or blocking worker execution threads, the system utilizes Redis Pub/Sub (Publish/Subscribe):

```text
                     ┌───────────────────┐
                     │     worker.ts     │
                     └─────────┬─────────┘
                               │
               (Publishes response text payload)
                               ▼
        ================= REDIS PUB/SUB =================
                     [Channel: wa_outbound]
        =================================================
                               ▲
                               │
              (Listens/Subscribes to channel)
                               │
                     ┌─────────┴─────────┐
                     │   wa-bridge.ts    │
                     └─────────┬─────────┘
                               │
                (Sends live message back over RF)
                               ▼
                        [Customer Phone]
```

### Flow Lifecycle

1. **Response Generation**: The decoupled worker (`scripts/worker.ts`) processes the message, queries the cache or LLM, and produces a final text response.
2. **Outbound Publication**: Instead of calling external APIs directly from the worker, the worker publishes the outbound payload onto the dedicated `wa_outbound` Redis channel.
3. **Daemon Dispatch**: The local WhatsApp Web daemon bridge (`scripts/wa-bridge.ts`) remains subscribed to the `wa_outbound` channel, intercepts the payload in real-time, and dispatches the live message directly back to the customer's phone.

---

## 📁 Data-Forward Domain Structure

The monorepo organizes commerce boundaries cleanly inside self-contained domain folders:

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
