---
type: ArchitectureBridge
title: AST Security Firewall & Chaos Testing
description: Explains how the AST security firewall guards codebase invariants and how to run the chaos test suite.
resource: scripts/ast-firewall.ts
tags: [security, testing, AST, compiler]
timestamp: 2026-06-21T18:58:00Z
---

## AST Security Firewall & Chaos Testing

The AST Security Firewall is a compiler-level safeguard that continuously monitors the codebase to prevent violations of structural architectural rules.

### Core Guardrails

The firewall enforces rules across the storefront and backend worker components:

- **Medusa Import Restriction:** Direct Medusa database imports are forbidden in favor of GraphQL client queries.
- **Zod Schema Constraining:** Mastra tool schemas and checkout parameters must enforce limits (e.g. string lengths, quantity boundaries).
- **Remix Route Security:** Remix actions must require session authentication, and webhook handlers must verify signatures.
- **Workflow & Network Isolation:** Promising maps calling raw AI embeddings must be throttled, and all storefront network calls must be wrapped within a Zod parser.
- **Worker Input Contracts:** Ingestion workers must process strictly typed objects matching `NormalizedPayload`.

### Local Development Watcher

To run the watcher locally in watch mode to scan modifications in real-time:

```bash
pnpm verify-agent
```

---

## Chaos Test Suite

To verify that the AST Security Firewall is auditing rules correctly without breaking normal development runs, we maintain a dedicated offline chaos-test suite.

### Isolated Scenario Mocking

The mock code containing violations for all 15 rules is located in:

- [chaos.tsx](../../scripts/chaos-tests/chaos.tsx) (Rules 1, 3, 5, 6, 7, 8, 9, 10, 11, 12, 14)
- [chaosTool.ts](../../scripts/chaos-tests/chaosTool.ts) (Rules 2, 13)
- [api.webhook.tsx](../../scripts/chaos-tests/api.webhook.tsx) (Rule 4)
- [worker.ts](../../scripts/chaos-tests/worker.ts) (Rule 15)

### Running Chaos Verification

To run a full-codebase sweep specifically targeted at these mock files, execute:

```bash
pnpm check:firewall:chaos
```

This forces the firewall to evaluate only the chaos tests and output the full list of 15 violations simultaneously into `.gate-results.json`.
