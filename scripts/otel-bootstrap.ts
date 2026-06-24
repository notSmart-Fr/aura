import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';

const exporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318/v1/traces',
});

const serviceNameLabel = process.env.OTEL_SERVICE_NAME ?? 'aura-voice-agent';

export const sdk = new NodeSDK({
  traceExporter: exporter,
  resource: new Resource({ 'service.name': serviceNameLabel }),
});
sdk.start();
