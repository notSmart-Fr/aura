---
type: ArchitectureBridge
title: Boundary Exception Architecture
description: Structured domain error classes and transport-to-UI error propagation across integration, database, and Remix boundaries.
resource: apps/storefront/app/domains/common/errors.ts
tags: [errors, boundaries, integration, database, remix, transport]
timestamp: 2026-06-23T12:00:00Z
---

## Boundary Exception Architecture

Every major data and transport junction in the monorepo must fail loudly with structured, typed domain errors — never silent suppression, generic string throws, or unhandled library crashes. This document defines the three boundary layers and how errors propagate to the UI.

See also: [AST Security Firewall & Chaos Testing](./security-firewall.md) (Rules 21, E1–E3 enforce catch-block and PII constraints).

---

## Shared Error Primitives

**Location:** [`apps/storefront/app/domains/common/errors.ts`](../../apps/storefront/app/domains/common/errors.ts)

| Class | Boundary | `code` examples |
| --- | --- | --- |
| `IntegrationError` | Third-party APIs, `fetch`, Zod response validation | `CONFIG_MISSING`, `NETWORK_HTTP_FAILURE`, `SCHEMA_MISALIGNMENT`, `UPSTREAM_API_ERROR` |
| `DatabaseDomainError` | pg Pool, Kysely, Redis, vector cache SQL | `GRAPH_TRAVERSAL_FAILED`, `CACHE_WRITE_FAILED` |

Both classes extend `Error` and carry:

- `code: string` — machine-readable failure category
- `meta: Record<string, unknown>` — **structural metadata only** (status, length, duration, method, flattened Zod issues). Raw user PII must never appear in `meta` (enforced by Rule E3).

```typescript
throw new IntegrationError(
  'NETWORK_HTTP_FAILURE',
  `Embedding request failed with HTTP ${response.status}`,
  { status: response.status, length: cleanText.length }
);
```

---

## Boundary 1 · Integration (Fetches / Third-Party APIs)

**Reference implementation:** [`apps/storefront/app/domains/ai-cache/embedding.client.ts`](../../apps/storefront/app/domains/ai-cache/embedding.client.ts)

| Requirement | Implementation |
| --- | --- |
| HTTP status guard | `response.ok` checked before parsing body |
| Schema validation | `.safeParse()` — never bare `.parse()` on network payloads |
| Rule 14 compliance | `fetch` nested inside the `safeParse()` argument tree (async IIFE pattern) |
| Idempotency | Mutating requests include `Idempotency-Key` header |

**Error code mapping:**

| Condition | Code |
| --- | --- |
| Missing API key / config | `CONFIG_MISSING` |
| `!response.ok` | `NETWORK_HTTP_FAILURE` |
| Zod `safeParse` failure | `SCHEMA_MISALIGNMENT` |
| Upstream API error union branch | `UPSTREAM_API_ERROR` |

---

## Boundary 2 · Database Domain (pg / Kysely / Vector Cache)

**Reference implementation:** [`apps/storefront/app/domains/ai-cache/cache-engine.server.ts`](../../apps/storefront/app/domains/ai-cache/cache-engine.server.ts)

| Operation | Code | Meta fields |
| --- | --- | --- |
| `getSemanticCache` failure | `GRAPH_TRAVERSAL_FAILED` | `method`, `duration` |
| `setSemanticCache` failure | `CACHE_WRITE_FAILED` | `method`, `length`, `duration` |

Catch-block contract (Rules 21 + E1):

1. Variable typed `: unknown`
2. First statement: `if (error instanceof Error)`
3. Re-throw `IntegrationError` / `DatabaseDomainError` without wrapping
4. Translate raw pg/Kysely exceptions into `DatabaseDomainError`

Cosine similarity queries on `cache_embeddings` remain governed by [Rule 16](./security-firewall.md) (`<=>` operator). Storage layout: [Vector Cache Schema](../data-models/vector-cache-schema.md).

---

## Boundary 3 · Transport-to-UI (Remix Actions & Client)

**Reference implementation:** [`apps/storefront/app/routes/_index.tsx`](../../apps/storefront/app/routes/_index.tsx) (concierge chat action + widget)

### Server action contract

Domain errors caught before generic `Error` fallback:

```typescript
if (error instanceof Error) {
  if (error instanceof IntegrationError || error instanceof DatabaseDomainError) {
    return json({ error: error.message, code: error.code }, { status: 500 });
  }
  return json({ error: error.message }, { status: 500 });
}
```

### Client widget contract

The chat `useEffect` monitors `fetcher.data` for the `error` key. On failure, it appends an agent message instead of freezing on infinite loading:

```typescript
} else if (data.error) {
  setMessages(prev => [...prev, {
    sender: "agent",
    text: `[${data.code ?? "ERROR"}] ${data.error}`,
  }]);
}
```

---

## Error Propagation Flow

```text
[ Third-party API ] ──fetch──► IntegrationError
                                      │
[ pg Pool / cache ] ──query──► DatabaseDomainError
                                      │
                                      ▼
                         [ Remix action catch ]
                                      │
                         json({ error, code }, 500)
                                      │
                                      ▼
                         [ fetcher.data.error ]
                                      │
                         [ Chat widget renders ]
```

---

## Verification

Run the AST firewall sweep after boundary changes:

```bash
pnpm check:firewall
```

Gate results are written to [`.gate-results.json`](../../.gate-results.json). Rules E1–E3 (see [security-firewall.md](./security-firewall.md)) programmatically enforce catch-block quality and metadata PII hygiene.

**Note:** Cross-domain edits (e.g. `common/` + `ai-cache/`) trigger the domain isolation gate in `ast-firewall.ts`. For intentional multi-domain changes, run:

```bash
node --no-warnings --experimental-strip-types scripts/ast-firewall.ts --no-isolation
```
