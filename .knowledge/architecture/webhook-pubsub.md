---
type: ArchitectureBridge
title: Webhook Data Bridge & Redis Pub/Sub Outbound Dispatch
description: Explains the high-speed webhook entry point and asynchronous outbound message delivery infrastructure via Redis Pub/Sub.
resource: .knowledge/architecture/webhook-pubsub.md
tags: [webhook, pubsub, redis, whatsapp, architecture]
timestamp: 2026-06-22T15:53:00Z
---

## Webhook Data Bridge & Redis Pub/Sub Outbound Dispatch

To connect WhatsApp events asynchronously without introducing blocking threads or tight filesystem dependencies, the system utilizes a high-speed webhook entry point coupled with a Redis Pub/Sub message distribution network.

---

### 1. Webhook Data Bridge Architecture

A non-blocking webhook endpoint resides at `/api/webhook/whatsapp` to ingest user messages immediately and offload processing:

```text
┌────────────────────────────────────────────────────────┐
│               REMIX WEBHOOK ROUTE (API)                │
│                                                        │
│  GET  /api/webhook/whatsapp  ──► [Verify Meta Token]   │
│                                                        │
│  POST /api/webhook/whatsapp  ──► [Validate JSON Schema] │
│                                         │              │
│                                         ▼              │
│                              [Push to BullMQ Redis]    │
│                                         │              │
│                                  (Returns 200 OK)      │
└────────────────────────────────────────────────────────┘
                                          │
                                          ▼ Out-of-Band
                               ┌───────────────────┐
                               │  worker.ts Loop   │
                               └───────────────────┘
```

#### Operations Lifecycle

1. **GET Verification**: Meta verifies webhook authenticity via the standard verify-token verification handshake.
2. **POST Event Ingestion**: Incoming WhatsApp JSON payloads (text message body, media attachments) are validated against a Zod schema, pushed onto the **BullMQ Redis** queue, and the route returns `200 OK` in milliseconds to prevent timeouts.
3. **Queue Processing**: The background worker process (`worker.ts`) consumes jobs off-band, routing them through rate-limiting, normalization, context hydration, and agent execution.

---

### 2. Redis Pub/Sub Outbound Dispatch Architecture

To broadcast outbound response payloads back to customers without blocking worker execution threads or calling external APIs directly from the worker context:

```text
                     ┌───────────────────┐
                     │     worker.ts     │
                     └─────────┬─────────┘
                               │
               (Publishes response text payload)
                               ▼
         ================= REDIS PUB/SUB =================
                      [Channel: wa_outbound]
         =================================================
                               ▲
                               │
               (Listens/Subscribes to channel)
                               │
                     ┌─────────┴─────────┐
                     │   wa-bridge.ts    │
                     └─────────┬─────────┘
                               │
                 (Sends live message back over RF)
                               ▼
                         [Customer Phone]
```

#### Flow Lifecycle

1. **Response Resolution**: The background worker generates the response text and publishes the payload onto the dedicated `wa_outbound` Redis channel.
2. **Bridge Subscription**: The local WhatsApp Web daemon bridge (`scripts/wa-bridge.ts`) subscribes to the channel in real-time.
3. **Delivery**: Upon intercepting a published payload, the bridge formats the message and sends it out to the customer's device.

---

### 3. Environment Variables

WhatsApp secrets are split across three files by responsibility — verify token (backend + storefront), app secret (storefront inbound), access token + phone ID (scripts outbound). See [environment-config.md](./environment-config.md) §7.
