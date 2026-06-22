// compiler-trigger-comment-v4
import { Worker, type Job } from "bullmq";
import { trace, type Span } from "@opentelemetry/api";
import { z } from "zod";

import { OrchestratorService } from "../apps/backend/src/domains/orchestrator/orchestrator.service";

const tracer = trace.getTracer("whatsapp-worker");

const WhatsAppDispatchResponseSchema = z.object({
  messaging_product: z.literal("whatsapp").optional(),
  contacts: z.array(z.object({ input: z.string(), wa_id: z.string() })).optional(),
  messages: z.array(z.object({ id: z.string() })).optional(),
});

export interface NormalizedPayload {
  text: string;
  metadata: {
    source: string;
    channel: string;
    platformUserId: string;
    sender: string;
    timestamp: number;
    messageId: string;
  };
  sessionHistory: { role: "user" | "model"; content: string }[];
}

interface PlatformAdapter {
  sendResponse(recipientId: string, text: string, messageId: string): Promise<void>;
}

class WhatsAppAdapter implements PlatformAdapter {
  async sendResponse(recipientId: string, text: string, messageId: string): Promise<void> {
    const response = z.instanceof(Response).parse(
      await fetch(
        `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `outbound-${messageId}`,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: recipientId,
            type: "text",
            text: {
              preview_url: false,
              body: text,
            },
          }),
        }
      )
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(
        `WhatsApp API dispatch failed with status ${response.status} (${response.statusText}): ${errorText}`
      );
    }

    const rawJson = await response.json();
    const parsedResponse = WhatsAppDispatchResponseSchema.parse(rawJson);

    console.log(
      `[Queue Worker] Dispatched outbound message to Meta. Message ID: ${parsedResponse.messages?.[0]?.id || "unknown"}`
    );
  }
}

const platformRegistry = new Map<string, PlatformAdapter>([
  ["whatsapp", new WhatsAppAdapter()],
]);

const orchestratorService = new OrchestratorService();

const worker = new Worker(
  "whatsapp-ingestion",
  async (job: Job) => {
    console.log(`[Queue Worker] Processing message from: ${job.data.sender}`);

    const redisClient = await worker.client;
    const clientKey = `rate:${job.data.sender}`;

    let isBlocked = false;
    await tracer.startActiveSpan("rate-limiter", async (span: Span) => {
      span.setAttribute("system.operation", "rate-limit");
      span.setAttribute("redis.key_prefix", "rate");

      const currentRequests = await redisClient.incr(clientKey);
      if (currentRequests === 1) {
        await redisClient.expire(clientKey, 10);
      }
      span.setAttribute("requests.count", currentRequests);

      if (currentRequests > 5) {
        isBlocked = true;
      }
      span.end();
    });

    if (isBlocked) {
      console.warn(`⚠️ [Rate Limiter] Blocked spam payload from: ${job.data.sender}`);
      return;
    }

    let normalizedText: string = job.data.text || "";

    if (job.data.attachments && job.data.attachments.length > 0) {
      const attachmentBlocks = job.data.attachments
        .map((att: { type: string; url: string }) => `\n\n### Attached Media [Type: ${att.type}]\n- File: ${att.url}`)
        .join("");
      normalizedText += attachmentBlocks;
    }

    const channel: string = typeof job.data.channel === "string" ? job.data.channel : "whatsapp";
    const platformUserId: string = job.data.sender;
    const messageId: string = job.id || `unknown-${Date.now()}`;

    const adapter = platformRegistry.get(channel);
    if (!adapter) {
      throw new Error(`[Queue Worker] No platform adapter registered for channel: ${channel}`);
    }

    const responseTexts = await orchestratorService.processIntent({
      text: normalizedText,
      channel,
      platformUserId,
    });

    await adapter.sendResponse(job.data.sender, responseTexts[0], messageId);
  },
  {
    connection: {
      host: "127.0.0.1",
      port: 6379,
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
    },
    limiter: {
      max: 1,
      duration: 4000,
    },
  }
);

worker.on("failed", (job: Job | undefined, err: Error) => {
  console.error(`❌ Job ${job?.id} failed:`, err);
});

async function shutdown(signal: string) {
  console.log(`Received ${signal}. Shutting down worker...`);
  try {
    await worker.close();
    await orchestratorService.close();
    console.log("Worker closed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Error during worker shutdown:", error);
    process.exit(1);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
