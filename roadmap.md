# Roadmap: Multi-Modal Resilient Ingestion Pipeline

This document maps out the core architectural milestones for the ingestion pipeline.

---

## 🏁 Phase 1: Ingestion & System Isolation

### [x] Goal 1: Asynchronous Queue Decoupling

* **Status**: Completed
* **Objective**: Isolate incoming public network endpoints (e.g. webhooks) from variable-latency AI processing by pushing tasks to a local Redis-backed queue (`BullMQ`) and returning quick `HTTP 200 OK` responses.

### [x] Goal 2: Multi-Modal Ingestion & Normalization

* **Status**: Completed
* **Objective**: Accept volatile external media streams (voice, images, messy text) and decode/normalize them into a single markdown or plain-text primitive format at the edge (`ingestion/`), shielding downstream business logic.

### [x] Goal 3: Token Governance & Rate Limiting

* **Status**: Completed
* **Objective**: Guard background queue workers with a Redis-backed token bucket script to rate-limit requests (e.g., by client phone number) before triggering LLM layers.

---

## 💾 Phase 2: Performance & Data Optimization

### [x] Goal 4: Semantic Vector Caching ("Hot Caching")

* **Status**: Completed
* **Objective**: Calculate input embeddings and search against historical extractions using PostgreSQL + `pgvector` to cache/retrieve matches, avoiding redundant LLM requests.

### [ ] Goal 5: Context-Window Payload Optimization

* **Status**: Pending
* **Objective**: Place static commands (system prompt, schemas) at the prompt head and volatile inputs at the tail to optimize LLM engine-level caching.

---

## 👁️ Phase 3: Telemetry & Static Integrity

### [ ] Goal 6: Dual-Layer System Telemetry

* **Status**: Pending
* **Objective**: Trace details out-of-band to an OpenTelemetry collector panel (SigNoz/Laminar) and write high-level operational counts to PostgreSQL.

### [ ] Goal 7: AST Structural Boundary Enforcement

* **Status**: In Progress
* **Objective**: Maintain `scripts/ast-firewall.ts` parser using `ts-morph` to block unsafe code and verify Zod constraints, idempotency keys, and domain isolation on every file save.
