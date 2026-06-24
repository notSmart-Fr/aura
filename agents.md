# Aura Project Instructions

You are building a luxury minimalist apparel AI storefront: Remix + Mastra + **Vendure** + WhatsApp + LiveKit Voice.

## Discovery

Consult `.knowledge/README.md` for full architecture. Use skills (below) for domain-specific guidance.

## Available Skills

Load a skill with `/skill-name` when starting a relevant task:

| Skill | When to load |
|-------|-------------|
| `/aura-architecture` | Codebase navigation, file layout, data flow, domain boundaries |
| `/aura-firewall` | Writing/editing code that must pass AST checks |
| `/aura-design` | Styling, UI, Tailwind, colors, typography, frontend |
| `/aura-pipeline` | RAG pipeline, embeddings, vector search, agents, semantic cache |

## Core Rules

- `OrchestratorService.processIntent` in `@dtc/ai-core` is the single source of truth — never duplicate in runners
- Shared AI code lives in `packages/ai-core/` (`@dtc/ai-core`), not in either app
- Apps import from `@dtc/ai-core/*` — no cross-app relative paths (`../../../../../apps/...`)
- Storefront keeps thin `.server.ts` re-export proxies only; implementation goes in ai-core
- Zod at every boundary: webhooks, Redis, API responses, GraphQL
- No `any`, no `z.any().parse()`, no naked `fetch`/`axios`
- Catch blocks: `unknown` + `instanceof Error` guard
- Idempotency keys on all mutating network calls
- Domain leaf nodes in storefront: catalog/, cart/, recommendations/ are UI-facing proxies

## Verification

AST firewall runs on save (`pnpm verify-agent`). Read `.gate-results.json` before declaring work complete. If `"passed": false`, fix violations.

## Key Docs

- `.knowledge/README.md` — full architecture, pipeline, conventions
- `.knowledge/runbook.md` — demo startup guide
- `.knowledge/demo-guide.md` — interview demo scenarios
- `design.md` — visual design tokens
