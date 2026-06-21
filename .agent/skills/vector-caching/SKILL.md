---
name: semantic-vector-caching
description: Enforces database-level vector similarity matching to prevent memory-heavy data processing bottlenecks.
match_glob: "scripts/worker.ts"
---

### 🧮 SEMANTIC DATABASE INVARIANTS

When interacting with our PostgreSQL vector cache layer:

1. **Native Query Operations:** You are strictly forbidden from pulling raw array records into application memory to calculate distances via JavaScript loops.
2. **Operator Enforcement:** You MUST execute the distance matching operation natively within the database engine using the raw cosine distance operator (`<=>`).
3. **Namespace Isolation:** All caching tables must be strictly separated from Vendure core storefront tables to avoid migration conflicts.
