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
