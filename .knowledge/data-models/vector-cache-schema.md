---
type: DataCatalogSpec
title: Neon AI Semantic Cache Storage Layout
description: Architectural layout of the 768-dimensional semantic cache query space and boundary error handling for cache read/write operations.
resource: scripts/worker.ts
tags: [database, vectors, postgres, caching, errors]
timestamp: 2026-06-23T12:00:00Z
---

## Neon AI Semantic Cache Storage Layout

Our semantic query cache is stored in a dedicated database schema namespace (`ai_cache`) in PostgreSQL:

### Database Table Shape: `ai_cache.cache_embeddings`

| Column Name | Type | Purpose |
| --- | --- | --- |
| **`id`** | `UUID` (Primary Key) | Unique identifier for the cache record. |
| **`input_text`** | `TEXT` | The clean, normalized text string we received. |
| **`embedding`** | `Vector(768)` | The mathematical coordinate map of the sentence (matching `gemini-embedding-2` dimensions). |
| **`response_json`** | `JSONB` | The historical extracted data result we want to reuse instantly on a cache hit. |
| **`created_at`** | `TIMESTAMP` | When this record was generated to manage expiration. |

### HNSW Index

To ensure high-performance similarity matching, a specialized HNSW index must be created on the embedding array:

```sql
CREATE INDEX IF NOT EXISTS idx_cache_embeddings_vector 
ON ai_cache.cache_embeddings 
USING hnsw (embedding vector_cosine_ops);
```

### Migrating from vector(384) to vector(768)

After switching to `gemini-embedding-2`, run once from repo root:

```powershell
node --no-warnings --experimental-strip-types scripts/migrate-cache-embeddings-768.ts
```

This truncates stale cache rows and alters the column to `vector(768)`.

### Runtime Boundary Errors

Cache read/write operations in [`cache-engine.server.ts`](../../apps/storefront/app/domains/ai-cache/cache-engine.server.ts) translate pg Pool failures into `DatabaseDomainError` (`GRAPH_TRAVERSAL_FAILED`, `CACHE_WRITE_FAILED`). Embedding API calls in [`embedding.client.ts`](../../apps/storefront/app/domains/ai-cache/embedding.client.ts) throw `IntegrationError` on HTTP, schema, or upstream failures. See [Boundary Exception Architecture](../architecture/boundary-exceptions.md).
