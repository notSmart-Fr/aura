---
name: aura-firewall
description: "AST firewall rules, compile-time checks, security gates, Zod enforcement, error handling, chaos testing"
---

# AST Firewall (scripts/ast-firewall.ts)

Run: `pnpm check:firewall` | Watch: `pnpm verify-agent`
Results: `.gate-results.json` → check `"passed": true` + `timestamp` freshness before declaring done.

## Critical Rules When Writing Code

| Rule | Enforces |
|------|----------|
| 1 | Storefront never imports backend DB directly — use GraphQL |
| 2 | Mastra tool inputs must have `.max()`, `.min()`, `.positive()` |
| 11 | Only allowed models: `deepseek-chat`, `gemini-2.0-flash`, `gemini-2.5-flash` |
| 13 | Cart/checkout tools require `idempotencyKey: z.string().uuid()`, quantity `.int().positive().max(99)`, no direct price inputs |
| 14 | No naked `fetch`/`axios` — must be Zod-wrapped |
| 16 | Semantic cache queries must use pgvector `<=>` operator |
| 19 | No explicit `any` on params or variables |
| 20 | No `z.any().parse()` bypass |
| 21 | Catch blocks: type `unknown`, first statement must be `instanceof Error` guard |
| E1 | No `as any` on catch variables |
| E2 | Empty catch blocks forbidden |
| E3 | No PII (`phone`, `email`, `transcript`, `text`) in error meta or console.error |

## After Saving
Read `.gate-results.json`. If `"passed": false`, fix violations. If timestamp is stale, restart watcher or nudge file.
