---
name: aura-pipeline
description: "RAG pipeline, vector search, embeddings, pgvector, context hydration, semantic cache, Gemini, Mastra agent, AI orchestration"
---

# Aura RAG Pipeline

## Current: Vector + Graph Hybrid RAG

Flow:
```
User text → Gemini embed-2 (768-dim) → pgvector cosine (<=>) → top-5 seeds
→ variant hydration → graph expand (collections, facets, paired products)
→ merged context → DeepSeek shopAgent → response
```

## Key Files
| File | Role |
|------|------|
| `orchestrator.service.ts` | Runs the pipeline: embedding → vector search → variant hydration → graph expansion → agent |
| `graph-retriever.server.ts` | Graph traversal: queries product_variant, product_collection, facet_value for 2-hop expansion |
| `cache-engine.server.ts` | Semantic cache (checks if similar query cached, threshold < 0.05) |
| `embedding.client.ts` | Calls Gemini embed-2 API, Zod-validated response |
| `shopAgent.ts` | Mastra agent (DeepSeek), tools: searchCatalog, exploreProduct, modifyCart, showRecommendations |

## Embedding Details
- Model: `gemini-embedding-2`
- Dimensions: 768
- Distance: cosine (`<=>`)
- Cache schema: `ai_cache.cache_embeddings` with HNSW index
- Product embeddings: `product.customFieldsEmbedding` (vector column)

## Agent Tools
- `searchCatalogTool` — GraphQL text search on Vendure (catalog domain)
- `exploreProduct` — Graph-based product exploration with collections, attributes, variants, related items
- `modifyCart` — Add variant to cart, idempotency UUID, GraphQL mutation
- `showRecommendations` — Enrich product handles with full detail from Vendure (Zod-validated response)

## Graph Expansion Pattern
1. Vector seeds from pgvector cosine match (existing)
2. Query product_collection for collection membership (hop 1)
3. Query facet_value for product attributes (hop 1)
4. Query sibling products in same collections (hop 2)
5. Format as tree-structured context for LLM

Graph expansion is non-fatal — falls back to vector-only if catalog tables are empty.
OTel spans: `graph-expand` → `graph-hop-1` → `graph-hop-2`
