# P2 + P3 Fixes Plan

## Summary
Complete the remaining audit items across two priority levels:

**P2 (High):**
1. OpenTelemetry metrics (counters + histograms) for pipeline observability
2. Zod response validation for the extractor agent
3. Create missing storefront/backend test directories

**P3 (Medium):**
4. Structured logging with pino (replace `console.log`/`console.error`)
5. Rate limiting returns typed result instead of silent early-return
6. E2E worker integration test (full mocked cycle)

---

## P2 Fixes

---

## 1. OpenTelemetry Metrics

**Problem:** The system only has OTel *traces* (spans). There are no metrics — no counters for messages processed, no histograms for pipeline stage durations. This makes it impossible to monitor throughput, latency distribution, or cache hit ratios.

**Files to modify:**
- `packages/ai-core/src/metrics.ts` (NEW) — Centralized meter + metric instruments
- `packages/ai-core/src/orchestrator.ts` — Record metrics at key pipeline stages
- `scripts/otel-bootstrap.ts` — Add `MeterProvider` initialization
- `packages/ai-core/package.json` + `package.json` (root) — Add `@opentelemetry/sdk-metrics` dep

### 1a. Install dependency
```bash
pnpm add @opentelemetry/sdk-metrics -w
```

### 1b. Create `packages/ai-core/src/metrics.ts`

Define a shared meter and four instruments:

| Instrument | Type | Attributes |
|-----------|------|------------|
| `aura.messages.processed` | Counter | `channel` (web\|whatsapp\|livekit_voice), `status` (cached\|ai_ok\|ai_fallback\|error) |
| `aura.cache.hits` | Counter | `layer` (semantic) |
| `aura.pipeline.duration_ms` | Histogram | `stage` (context-hydration\|graph-expand\|cache-write) |
| `aura.tools.executed` | Counter | `tool_name` (searchCatalog\|exploreProduct\|modifyCart\|showRecommendations) |

```typescript
import { metrics } from "@opentelemetry/api";

const meter = metrics.getMeter("aura-pipeline");

export const messagesProcessed = meter.createCounter("aura.messages.processed", {
  description: "Total messages processed through the pipeline",
});

export const cacheHits = meter.createCounter("aura.cache.hits", {
  description: "Cache hit/miss counts",
});

export const pipelineDuration = meter.createHistogram("aura.pipeline.duration_ms", {
  description: "Pipeline stage duration in milliseconds",
  unit: "ms",
});

export const toolExecutions = meter.createCounter("aura.tools.executed", {
  description: "Tool execution counts by tool name",
});
```

### 1c. Modify `packages/ai-core/src/orchestrator.ts`

Import metrics and record at these points:

| Location | Call | Attributes |
|----------|------|------------|
| After cache check | `cacheHits.add(1, { layer: "semantic", hit: String(!!cached) })` | — |
| Cache-hit early return | `messagesProcessed.add(1, { channel, status: "cached" })` | — |
| Before context hydration | `const start = Date.now()` | — |
| After context hydration | `pipelineDuration.record(Date.now() - start, { stage: "context-hydration" })` | — |
| After graph expand | `pipelineDuration.record(...)` | `stage: "graph-expand"` |
| After shopAgent | `messagesProcessed.add(1, { channel, status: isFallback ? "ai_fallback" : "ai_ok" })` | — |
| After cache write | `pipelineDuration.record(...)` | `stage: "cache-write"` |

All metric calls are synchronous and non-blocking — no try/catch needed.

### 1d. Modify `scripts/otel-bootstrap.ts`

Add `MeterProvider` to export metrics via OTLP alongside traces:

```typescript
import { metrics } from '@opentelemetry/api';
import { MeterProvider } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

const metricExporter = new OTLPMetricExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318/v1/metrics',
});
const meterProvider = new MeterProvider({
  readers: [new PeriodicExportingMetricReader({ exporter: metricExporter, exportIntervalMillis: 10000 })],
});
metrics.setGlobalMeterProvider(meterProvider);
```

Note: If no OTLP endpoint is configured, OTel provides a no-op meter provider by default — metrics never crash.

---

## 2. Extractor Zod Response Validation

**Problem:** [extractor.ts](file:///i:/aura/packages/ai-core/src/extractor.ts) returns raw `.text` from the Gemini agent. There's no schema enforcement — malformed JSON propagates blindly into context hydration.

**Files to modify:**
- `packages/ai-core/src/extractor.ts` — Add Zod schema, parse & validate response
- `packages/ai-core/src/__tests__/extractor.test.ts` (NEW)

### 2a. Update `extractor.ts`

Add schema:
```typescript
export const ExtractionSchema = z.object({
  classification: z.enum(["inquiry", "order", "support"]),
  entities: z.array(z.string()),
  urgency: z.enum(["high", "medium", "low"]),
});
export type ExtractionResult = z.infer<typeof ExtractionSchema>;
```

Change `extractPayloadData` return type to `Promise<ExtractionResult | null>`.

Parse logic after `response.text`:
1. Strip markdown code fences (` ```json ` / ` ``` `) if present
2. `JSON.parse()` the cleaned text
3. `ExtractionSchema.parse()` on the parsed object
4. On any failure → `console.warn` + return `null`

### 2b. Update `orchestrator.ts` caller

Change the classification injection from raw string to `JSON.stringify(classification)`:
```typescript
if (classification) {
  hydratedText = `${hydratedText}\n\n[Inbound Classification (Grounding Only):\n${JSON.stringify(classification)}]`;
}
```

### 2c. Create `packages/ai-core/src/__tests__/extractor.test.ts`

4 test cases:
1. Valid extraction JSON parses correctly
2. Malformed JSON (not valid JSON) returns null gracefully
3. Missing required fields returns null
4. Wrong enum values (e.g. "spam" for classification) returns null

Mock the agent's `generate` method to control response text.

---

## 3. Missing Test Directories

**Problem:** [vitest.config.ts](file:///i:/aura/vitest.config.ts) globs include `apps/storefront/app/**/__tests__` and `apps/backend/src/**/__tests__`, but neither exists.

**Files to create:**
- `apps/storefront/app/__tests__/placeholder.test.ts`
- `apps/backend/src/__tests__/placeholder.test.ts`

Simple placeholder test confirming vitest can discover files there:
```typescript
import { describe, expect, it } from "vitest";
describe("placeholder", () => {
  it("verifies test infrastructure", () => expect(true).toBe(true));
});
```

---

## P3 Fixes

---

## 4. Structured Logging with Pino

**Problem:** The entire codebase uses `console.log`/`console.error` for logging — no log levels, no JSON structure, no request context propagation. This makes log aggregation, filtering, and debugging in production unnecessarily difficult.

`console.log`/`console.error` is used in:
- [scripts/worker.ts](file:///i:/aura/scripts/worker.ts) — 7 call sites
- [packages/ai-core/src/orchestrator.ts](file:///i:/aura/packages/ai-core/src/orchestrator.ts) — 9 call sites
- [packages/ai-core/src/cache-engine.ts](file:///i:/aura/packages/ai-core/src/cache-engine.ts) — 0 (structured errors only)
- [scripts/voice-agent.ts](file:///i:/aura/scripts/voice-agent.ts) — 5 call sites

**Files to modify:**
- `packages/ai-core/src/logger.ts` (NEW) — Shared pino logger instance
- `scripts/worker.ts` — Replace `console.log`/`console.error` with logger
- `packages/ai-core/src/orchestrator.ts` — Replace `console.log`/`console.error` with logger
- `scripts/voice-agent.ts` — Replace `console.log`/`console.error` with logger
- `package.json` (root) — Add `pino` dependency

### 4a. Install pino
```bash
pnpm add pino -w
```

### 4b. Create `packages/ai-core/src/logger.ts`

```typescript
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});
```

For development, `pino-pretty` gives human-readable output. In production, raw JSON for log aggregators.

### 4c. Replace all `console.log`/`console.error` calls

Mapping of replacements:

**`scripts/worker.ts`:**
| Before | After |
|--------|-------|
| `console.log(\`[Queue Worker] Processing message from: ...\`)` | `logger.info({ sender }, "processing message")` |
| `console.warn(\`[Rate Limiter] Blocked spam payload from: ...\`)` | `logger.warn({ sender }, "rate limit exceeded")` |
| `console.log(\`[Queue Worker] Dispatched outbound message...\`)` | `logger.info({ messageId }, "outbound dispatched")` |
| `console.error(\`❌ Job ${job?.id} failed:\`, err)` | `logger.error({ jobId: job?.id, err }, "job failed")` |
| `console.log("Received signal...")` | `logger.info({ signal }, "shutdown initiated")` |

**`packages/ai-core/src/orchestrator.ts`:**
| Before | After |
|--------|-------|
| `console.log("[OrchestratorService] Generating embedding coordinates...")` | `logger.debug("generating embedding")` |
| `console.log("[OrchestratorService] Executing Kysely vector similarity search...")` | `logger.debug("executing vector search")` |
| `console.warn("[OrchestratorService] Semantic cache lookup failed...")` | `logger.warn({ err: msg }, "cache lookup failed")` |
| `console.warn("[OrchestratorService] Graph expansion failed...")` | `logger.warn({ err: msg }, "graph expansion failed")` |
| `console.warn("[OrchestratorService] Payload extraction failed...")` | `logger.warn({ err: msg }, "extraction failed")` |
| `console.log("[OrchestratorService] Triggering shopAgent...")` | `logger.info("triggering shopAgent")` |
| `console.log("[OrchestratorService] Layered context hydration completed...")` | `logger.info("context hydration completed")` |

**`scripts/voice-agent.ts`:**
| Before | After |
|--------|-------|
| `console.log("[Voice Portal] Connecting...")` | `logger.info({ room: ctx.room.name }, "connecting to room")` |
| `console.log("[Voice Boundary] Transcribed Input: ...")` | `logger.info({ transcript: transcribedText }, "transcribed input")` |
| `console.error("[Voice Pipeline Error]: ...")` | `logger.error({ err: msg }, "voice pipeline error")` |

### 4d. Export `logger` from `@dtc/ai-core`

Add to `package.json` exports:
```json
"./logger": "./src/logger.ts",
```

### 4e. Add `pino-pretty` dev dependency for development formatting

---

## 5. Rate Limiting Returns Typed Result

**Problem:** When rate limiting blocks a message in `processWhatsAppMessage`, it silently returns. The caller (BullMQ worker callback or test) has no way to know the message was rate-limited vs. processed successfully.

**Files to modify:**
- `scripts/worker.ts` — Return typed result from `processWhatsAppMessage`

### 5a. Add a result type

```typescript
export type ProcessMessageResult =
  | { status: "rate_limited"; sender: string }
  | { status: "ok"; channel: string; text: string; messageId: string };
```

### 5b. Update `processWhatsAppMessage` return type

Change from `Promise<void>` to `Promise<ProcessMessageResult>`.
Return `{ status: "rate_limited", sender }` when blocked.
Return `{ status: "ok", channel, text, messageId }` on success.

### 5c. Update BullMQ worker callback

The worker callback ignores the return value (BullMQ doesn't use it). The benefit is for unit tests — they can assert on the return value instead of spying on side effects.

---

## 6. Worker E2E Integration Test

**Problem:** The existing worker tests ([worker.test.ts](file:///i:/aura/packages/ai-core/src/__tests__/worker.test.ts)) test individual behaviors in isolation. There's no test that validates the full cycle: message → rate limit check → normalization → orchestrator → adapter dispatch.

**Files to create:**
- `packages/ai-core/src/__tests__/worker-e2e.test.ts` (NEW)

### 6a. Create the E2E test

Test a complete cycle with all mocks wired:

```typescript
import { describe, expect, it, vi } from "vitest";

describe("worker e2e cycle", () => {
  it("processes a message through the full pipeline", async () => {
    // Mock Redis (rate limit passes)
    // Mock OrchestratorService (returns { text: "reply", toolResults: [] })
    // Mock adapter fetch (returns successful WhatsApp API response)
    
    const result = await processWhatsAppMessage(
      { id: "e2e-test-id", data: { text: "show me coats", sender: "+15551234567" } },
      mockRedisClient,
    );
    
    expect(result.status).toBe("ok");
    // Assert orchestrator was called with the right input
    // Assert fetch was called with WhatsApp Graph API
  });
  
  it("returns rate_limited when threshold exceeded", async () => {
    // Mock Redis returning 6
    const result = await processWhatsAppMessage(...);
    expect(result.status).toBe("rate_limited");
  });
  
  it("throws on unknown channel with structured error", async () => {
    // Set channel to "telegram"
    await expect(processWhatsAppMessage(...)).rejects.toThrow();
  });
});
```

**Design note:** This is distinct from the existing `worker.test.ts` — it tests the *full wired pipeline* rather than isolated concerns. The existing tests remain as unit tests for specific behaviors.

---

## Verification Steps

After implementing all 6 fixes:

1. **AST firewall:** `pnpm check:firewall` — 0 violations
2. **Tests:** `pnpm test` — all tests pass (existing 23 + new extractor tests + E2E tests)
3. **Metrics:** Confirm `metrics.ts` instruments are created without throwing
4. **Extractor:** Confirm `extractPayloadData` returns `ExtractionResult | null` with typed fields
5. **Structured logging:** Confirm `logger.info/warn/error` works with both `console.log` replacement and TTY transport
6. **Rate limiting:** Confirm `processWhatsAppMessage` returns typed result in both success and rate-limited paths

---

## Assumptions & Decisions

- **Pino chosen over winston:** Pino is faster (benchmarked 5x faster than winston), smaller bundle, and has native ES module support (critical for this project which uses `"type": "module"`)
- **pino-pretty only in development:** Raw JSON by default, `pino-pretty` transport only in `development` NODE_ENV
- **OTel metrics use no-op fallback:** If `@opentelemetry/sdk-metrics` isn't configured, OTel's built-in no-op meter provider handles all `.add()`/`.record()` calls without throwing
- **E2E test mocks Redis + adapters:** No actual Redis connection or HTTP calls — tests remain fast and deterministic
