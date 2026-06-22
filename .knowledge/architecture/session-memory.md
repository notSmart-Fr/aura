---
type: ArchitectureBridge
title: Channel-Agnostic Redis Session Memory
description: Explains multi-turn conversation memory, platform adapter registry dispatch, OrchestratorService as the single source of truth for Redis session state, and strict Zod-validated Redis serialization in the ingestion worker.
resource: scripts/worker.ts
related:
  - apps/backend/src/domains/orchestrator/orchestrator.service.ts
tags: [redis, session, memory, platform-adapter, worker, orchestrator, architecture]
timestamp: 2026-06-22T15:55:00Z
---

## Channel-Agnostic Redis Session Memory

The ingestion worker is a thin transport runner. It delegates all AI execution and conversation state management to [`OrchestratorService`](../../apps/backend/src/domains/orchestrator/orchestrator.service.ts). Outbound responses are dispatched through a typed platform adapter registry. See also [AST Security Firewall](./security-firewall.md).

---

### 1. Platform Adapter Registry

Outbound channel delivery is isolated behind a `PlatformAdapter` interface. The worker resolves adapters at runtime via `payload.metadata.channel`:

```text
┌────────────────────────┐     channel lookup      ┌──────────────────────┐
│ scripts/worker.ts      │────────────────────────►│ PlatformRegistry     │
│ (after processIntent)  │                         │ Map<channel, Adapter>│
└────────────────────────┘                         └──────────┬───────────┘
                                                              │
                                                              ▼
                                                   ┌──────────────────────┐
                                                   │ WhatsAppAdapter      │
                                                   │ .sendResponse(...)   │
                                                   └──────────────────────┘
```

- **Interface contract:** `sendResponse(recipientId, text, messageId)`
- **Current adapters:** `whatsapp` → `WhatsAppAdapter` (Meta Cloud API v21.0)
- **Network isolation:** All `fetch` calls remain wrapped in `z.instanceof(Response).parse(...)` with `Idempotency-Key` headers (AST Rules 14a/14b)

---

### 2. Redis Session Key Pattern

Session history is stored as a JSON string under a composite key:

```text
session:{channel}:{platformUserId}
```

| Field | Example | Purpose |
|-------|---------|---------|
| `channel` | `whatsapp` | Platform namespace for adapter routing |
| `platformUserId` | E.164 phone number | Stable per-user identity on that channel |

**TTL:** 30 minutes (`EX 1800`) — refreshed on every successful turn append.

---

### 3. Zod Serialization Contract

Redis payloads are strictly validated on read and write inside `OrchestratorService`. No `z.any()` bypasses are permitted (AST Rule 20).

```typescript
const ConversationTurnSchema = z.object({
  role: z.enum(["user", "model"]),
  content: z.string(),
});
const SessionHistorySchema = z.array(ConversationTurnSchema);
```

| Operation | Validation |
|-----------|------------|
| `getHistory()` | `SessionHistorySchema.parse(JSON.parse(raw))` |
| `appendTurns()` | Merge existing + new turns, re-validate full array |

---

### 4. Processing Lifecycle

```text
BullMQ Job (scripts/worker.ts)
    │
    ├─► Rate Limit Span (OTel)
    │
    ├─► Text Normalization (attachments merged into normalizedText)
    │
    └─► OrchestratorService.processIntent({ text, channel, platformUserId })
            │                           ┌─────────────────────────────────────┐
            │                           │  OrchestratorService (single source │
            │                           │  of truth for Redis session state)  │
            ├─► getHistory()            │  Redis READ                         │
            │                           │                                     │
            ├─► context-hydration Span  │  getEmbedding → Kysely pgvector     │
            │   (OTel)                  │  cosine query → variant lookup      │
            │                           │                                     │
            ├─► shopAgent.generate()    │  Mastra AI generation               │
            │                           │                                     │
            ├─► appendTurns()           │  Redis WRITE (clean text only,      │
            │                           │  no catalog context stored)         │
            │                           └─────────────────────────────────────┘
            │
            └─► returns string[]
                    │
                    ▼
         adapter.sendResponse(sender, responseTexts[0], messageId)
         (transport delivery — scripts/worker.ts only)
```

**Turn persistence guarantees:**
- `appendTurns` is called only after `shopAgent.generate` succeeds — no orphaned Redis state on AI failures.
- `appendTurns` completes before `processIntent` returns — the caller (`sendResponse`) always works with a consistent history state.
- Catalog grounding context is stripped before storage: only the raw user message text is persisted under `role: "user"`.

---

### 5. OrchestratorService — Single Source of Truth

`OrchestratorService` owns the full session lifecycle, making it independently instantiable by future transport runners (e.g. voice streaming hooks) without Redis logic leaking into each runner:

```typescript
export interface ProcessIntentInput {
  text: string;        // normalized user message (attachments merged)
  channel: string;
  platformUserId: string;
}

export class OrchestratorService {
  async processIntent(input: ProcessIntentInput): Promise<string[]>
  async close(): Promise<void>   // quits Redis + destroys TypeORM pool
}
```

**Caller responsibility (scripts/worker.ts):**
```typescript
const responseTexts = await orchestratorService.processIntent({ text, channel, platformUserId });
await adapter.sendResponse(sender, responseTexts[0], messageId);
```

---

### 6. NormalizedPayload Extension

`NormalizedPayload` remains exported from `scripts/worker.ts` for compatibility with the `scripts/chaos-tests/worker.ts` AST Rule 15 test fixture:

```typescript
export interface NormalizedPayload {
  text: string;
  metadata: {
    source: string;
    channel: string;
    platformUserId: string;
    sender: string;
    timestamp: number;
    messageId: string;
  };
  sessionHistory: { role: "user" | "model"; content: string }[];
}
```
