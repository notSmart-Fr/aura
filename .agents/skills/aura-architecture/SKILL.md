---
name: aura-architecture
description: "Aura system architecture, directory layout, domain boundaries, data flow, file locations, orchestrator pipeline, and conventions"
---

# Aura Architecture

## Data Flow
```
WhatsApp/Web → webhook (Zod) → BullMQ → worker.ts → OrchestratorService.processIntent
LiveKit Voice → STT → voice-agent.ts → OrchestratorService.processIntent
Web → shopAgent → tools (GraphQL) → Vendure
```

`OrchestratorService.processIntent` is the single source of truth.
Both WhatsApp and LiveKit share it. Never duplicate its logic in transport runners.

## Directory Map
```
apps/backend/src/domains/orchestrator/orchestrator.service.ts  ← core pipeline
apps/storefront/app/domains/    ← domain leaf nodes (catalog, cart, recommendations, ai-cache, common)
apps/storefront/app/mastra/agents/shopAgent.ts  ← Mastra agent def
apps/storefront/app/routes/     ← Remix routes (incl. api.webhook.whatsapp.ts)
scripts/worker.ts               ← BullMQ WhatsApp worker (thin transport)
scripts/voice-agent.ts          ← LiveKit voice agent (thin transport)
scripts/ast-firewall.ts         ← 21 compile-time rules
.knowledge/README.md            ← Full architecture overview
.knowledge/runbook.md           ← Demo startup guide
```

## Transport vs Engine Split
| Layer | Where | Owns |
|-------|-------|------|
| Transport | scripts/worker.ts, voice-agent.ts | Queue loop, rate limit, normalize, adapter.sendResponse |
| Engine | orchestrator.service.ts | Redis sessions, vector hydration, shopAgent.generate |

## Key Patterns
- Zod at every input boundary (webhooks, Redis, API responses)
- PlatformAdapter registry for channel dispatch
- Idempotency keys on all mutating network calls
- Structured errors: IntegrationError (API), DatabaseDomainError (DB)
- Redis sessions: `session:{channel}:{platformUserId}`, 30min TTL
- Never store catalog grounding context in Redis — only raw user/assistant text
