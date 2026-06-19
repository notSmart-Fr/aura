---
type: DataCatalogSpec
title: Neon pgvector Storage Layout
description: Architectural layout of the 1536-dimensional semantic query space.
resource: scripts/ast-firewall.ts
tags: [database, vectors, postgres]
timestamp: 2026-06-19T18:12:00Z
---

## Neon pgvector Storage Layout

Our semantic product catalog queries execute directly inside Neon using `pgvector` relations:

* **Dimensions**: 1536 axes matching `google/gemini-embedding-001`.
* **Distance Metric**: Cosine Similarity via the `<=>` operator.

This graph structure enforces schema alignments checking via the lean compiler firewall script.
