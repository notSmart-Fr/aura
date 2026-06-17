import { Mastra } from '@mastra/core';
import { shopAgent } from './agents/shopAgent';

export const mastra = new Mastra({
  agents: { shopAgent },
  telemetry: {
    serviceName: 'aura-storefront-remix-agents',
    enabled: true,
    export: {
      type: 'otlp',
      endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
    },
  },
});
