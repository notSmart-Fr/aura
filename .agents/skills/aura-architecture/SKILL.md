---
name: aura-architecture
description: "Aura system architecture, directory layout, domain boundaries, data flow, file locations, orchestrator pipeline, and conventions"
---

# Aura Architecture

Commerce backend: **Vendure**. Storefront: **Remix**. AI pipeline: **`@dtc/ai-core`**.

## Data Flow
```
WhatsApp/Web → webhook (Zod) → BullMQ → worker.ts → OrchestratorService.processIntent
LiveKit Voice → STT → voice-agent.ts → OrchestratorService.processIntent
Web → web-orchestrator.server.ts → OrchestratorService.processIntent
OrchestratorService → shopAgent → tools (GraphQL) → Vendure
```

`OrchestratorService.processIntent` in `@dtc/ai-core` is the single source of truth.
Never duplicate its logic in transport runners.

## Directory Map
```
packages/ai-core/src/orchestrator.ts     ← core pipeline (THE BRAIN)
packages/ai-core/src/agents/shopAgent.ts ← Mastra agent
packages/ai-core/src/tools/            ← searchCatalog, modifyCart, etc.
apps/backend/src/                      ← Vendure server + plugins
apps/storefront/app/domains/           ← thin re-export proxies to @dtc/ai-core
apps/storefront/app/routes/            ← Remix routes (incl. api.webhook.whatsapp.ts)
scripts/worker.ts                      ← BullMQ WhatsApp worker (thin transport)
scripts/voice-agent.ts                 ← LiveKit voice agent (thin transport)
scripts/ast-firewall.ts                ← 21 compile-time rules
.knowledge/README.md                   ← Full architecture overview
```

## Transport vs Engine Split
| Layer | Where | Owns |
|-------|-------|------|
| Transport | scripts/worker.ts, voice-agent.ts, web-orchestrator | Channel I/O, rate limit, adapter dispatch |
| Engine | `@dtc/ai-core/orchestrator` | Redis sessions, vector hydration, shopAgent.generate |

## Key Patterns
- Zod at every input boundary (webhooks, Redis, API responses)
- PlatformAdapter registry for channel dispatch
- Idempotency keys on all mutating network calls
- Structured errors: IntegrationError (API), DatabaseDomainError (DB)
- Redis sessions: `session:{channel}:{platformUserId}`, 30min TTL
- Never store catalog grounding context in Redis — only raw user/assistant text
- Commerce data via Vendure GraphQL only — never direct DB imports from storefront
