---
type: ArchitectureBridge
title: AST Security Firewall & Chaos Testing
description: Explains how the AST security firewall guards codebase invariants and lists all 21 compile-time rules plus boundary exception gates E1–E3.
resource: scripts/ast-firewall.ts
tags: [security, testing, AST, compiler, errors, boundaries]
timestamp: 2026-06-23T12:00:00Z
---

## AST Security Firewall & Chaos Testing

The AST Security Firewall is a compiler-level safeguard that continuously monitors the codebase to prevent violations of structural architectural rules.

```text
┌─────────────────┐       Writes Code       ┌──────────────────┐
│                 │────────────────────────►│  AST Linter Gate  │
│    AI Agent     │                         └──────────────────┘
│                 │◄────────────────────────         │
└─────────────────┘   Fails Gate / Forced to         │ Evaluates Syntax
                       Write Proper Types            ▼
                                            ┌──────────────────┐
                                            │ Pass/Fail Matrix │
                                            └──────────────────┘
```

---

## 🔒 AST Compiler Firewall Rules

All structural guidelines and boundaries are programmatically checked via custom static analysis (`ts-morph`) in [ast-firewall.ts](file:///i:/aura/scripts/ast-firewall.ts). The firewall evaluates twenty-one structural gates plus three boundary exception gates (E1–E3). For how domain errors are thrown and propagated, see [Boundary Exception Architecture](./boundary-exceptions.md).

1. **GraphQL Client Isolation**: Storefront routes are prohibited from importing backend database drivers or services directly; all data passes through the GraphQL client or Mastra tools.
2. **Unbound Mastra Tool Parameters**: Tool schemas in `app/domains/` must export input schemas ending in `Schema`, enforcing strict size constraints (`.max()` for strings, `.min()` or `.positive()` and `.max()` for numbers).
3. **Unauthenticated Remix Actions**: Every HTTP POST action in storefront routes must perform session/authentication validation.
4. **Webhook Signature Validation**: Webhook endpoints must check signature headers (`x-vendure-signature`) to protect against event replay attacks.
5. **AI Concurrency Limit**: AI embeddings and Gemini client loops must be batched/throttled instead of wrapped in plain, unthrottled `Promise.all` maps.
6. **Controlled Form Inputs**: Raw `onChange` listeners on standard `<input>` tags must have debounced/value bindings to prevent search flood vectors.
7. **Stream Sanitization**: LLM generation output must be parsed and sanitized with `validateAndFilterOutput`.
8. **Process.Env Access Block**: Direct referencing of `process.env.*` in client components or tools is forbidden to prevent context exposure leaks.
9. **Telemetry Anonymization**: Database hashes or primary identifiers must be stripped before being passed to tracking events.
10. **Banned Jsx Spreads**: Spread operators (`{...props}`) are prohibited on custom component tags to prevent implicit data exposures.
11. **AI Model Constraint**: Mastra Agents are restricted to validated models (`google/gemini-2.0-flash`, `google/gemini-2.5-flash`, `deepseek-chat`, etc.).
12. **Mastra Tool Metadata**: All created tools must have a precise alphanumeric `id` and a detailed description of at least 20 characters.
13. **E-commerce Security & Idempotency**:
    - State-mutating tools inside `domains/cart/` and `domains/checkout/` must include `idempotencyKey: z.string().uuid()`.
    - Quantity properties must enforce positive integer types (`.int().positive()`) and a maximum limit of `.max(99)`.
    - Direct `price` or `amount` inputs in client-facing tool schemas are strictly forbidden (prices must resolve exclusively on the backend).
14. **Storefront Network Isolation**:
    - Raw unvalidated network payloads (`fetch`, `axios`) are forbidden; all network calls must be wrapped inside a structural Zod schema validation node (e.g. `Schema.parse()`).
    - Mutating outbound network calls must explicitly declare an `'Idempotency-Key'` header assigned to a unique UUID.
15. **Ingestion Worker Normalization**: Downstream ingestion payload processors must consume strictly structured `NormalizedPayload` types.
16. **Cosine Similarity Distance Query**: Queries targeting the `cache_embeddings` semantic database table must execute similarity distance matches utilizing the native pgvector `<=>` operator.
17. **Context-Window Cache Optimization**: Tail-volatile user prompt variables must be appended at the absolute suffix of dynamic template string statements to maximize caching performance.
18. **Telemetry Data Leakage Prevention**: Tracing span attribute setters (`.setAttribute`) inside worker environments must not record keys containing sensitive terms (`phone`, `sender`, `text`, `message`).
19. **Explicit Any Prevention**: Disallows explicit `any` type overrides on parameters and variable declarations to protect pipeline type-safety.
20. **Zod Any Bypass Prevention (Anti-Cheat)**: Disallows the use of `z.any().parse()` network gate bypass shortcuts. Explicit structural schema validation is strictly mandatory.
21. **Explicit Catch-Block Type-Guarding**: Disallows naked or un-typed catch blocks within orchestration and storage domains. Every exception variable must be explicitly typed as `unknown`, and if unsafe property access is performed (dot notation like `err.message` or bracket notation like `err['stack']`), the first statement must execute a type-safe structural verification (e.g., `if (error instanceof Error)`) before any properties are evaluated.

### Boundary Exception Gates (E1–E3)

Enforced alongside Rule 21 to eliminate silent failures and PII leaks in error paths. See [Boundary Exception Architecture](./boundary-exceptions.md) for the runtime error classes these gates protect.

**E1. Lazy Catch Variable Guards**
- Blocks `as any` casts on catch variables (`(err as any)`, `<any>err`).
- Blocks `.message` access on catch variables unless the block contains an `instanceof Error`, `instanceof IntegrationError`, or `instanceof DatabaseDomainError` guard.

**E2. Empty Catch Block Ban**
- Every `CatchClause` must have a non-empty body. Silent suppression (`catch { }`) is forbidden — exceptions must be logged, traced, or re-thrown.

**E3. Error Metadata PII Prevention**
- Rejects property keys matching `/phone|email|transcript|text/i` in the metadata object passed to `new IntegrationError(...)` or `new DatabaseDomainError(...)`.
- Rejects direct identifier arguments matching the same pattern in `console.error(...)` calls.

---

## Local Development Watcher

To run the watcher locally in watch mode to scan modifications in real-time:

```bash
pnpm verify-agent
```

---

## Chaos Test Suite

To verify that the AST Security Firewall is auditing rules correctly without breaking normal development runs, we maintain a dedicated offline chaos-test suite.

### Isolated Scenario Mocking

The mock code containing violations for all rules is located in:

- [chaos.tsx](../../scripts/chaos-tests/chaos.tsx) (Rules 1, 3, 5, 6, 7, 8, 9, 10, 11, 12, 14)
- [chaosTool.ts](../../scripts/chaos-tests/chaosTool.ts) (Rules 2, 13)
- [api.webhook.tsx](../../scripts/chaos-tests/api.webhook.tsx) (Rule 4)
- [worker.ts](../../scripts/chaos-tests/worker.ts) (Rule 15)
- [catch-block.ts](../../scripts/chaos-tests/catch-block.ts) (Rule 21, E1–E2)

### Running Chaos Verification

To run a full-codebase sweep specifically targeted at these mock files, execute:

```bash
pnpm check:firewall:chaos
```

This forces the firewall to evaluate only the chaos tests and output the full list of violations simultaneously into `.gate-results.json`.
