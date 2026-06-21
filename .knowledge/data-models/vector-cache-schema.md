---
type: DataCatalogSpec
title: Neon AI Semantic Cache Storage Layout
description: Architectural layout of the 384-dimensional semantic cache query space.
resource: scripts/worker.ts
tags: [database, vectors, postgres, caching]
timestamp: 2026-06-21T18:44:00Z
---

## Neon AI Semantic Cache Storage Layout

Our semantic query cache is stored in a dedicated database schema namespace (`ai_cache`) in PostgreSQL:

### Database Table Shape: `ai_cache.cache_embeddings`

| Column Name | Type | Purpose |
| --- | --- | --- |
| **`id`** | `UUID` (Primary Key) | Unique identifier for the cache record. |
| **`input_text`** | `TEXT` | The clean, normalized text string we received. |
| **`embedding`** | `Vector(384)` | The mathematical coordinate map of the sentence (e.g. matching `bge-small` dimensions). |
| **`response_json`** | `JSONB` | The historical extracted data result we want to reuse instantly on a cache hit. |
| **`created_at`** | `TIMESTAMP` | When this record was generated to manage expiration. |

### HNSW Index

To ensure high-performance similarity matching, a specialized HNSW index must be created on the embedding array:

```sql
CREATE INDEX IF NOT EXISTS idx_cache_embeddings_vector 
ON ai_cache.cache_embeddings 
USING hnsw (embedding vector_cosine_ops);
```
