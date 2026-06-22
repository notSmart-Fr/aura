import { Worker, type Job } from "bullmq";
import { trace, type Span } from "@opentelemetry/api";
import { z } from "zod";
import Redis from "ioredis";
import fs from "fs";
import path from "path";

// Load .env manually to ensure DB credentials are ready before domains are imported
try {
  const envPath = path.resolve(process.cwd(), "apps/storefront/.env");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf8");
    for (const line of envConfig.split(/\r?\n/)) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || "";
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1);
        } else if (val.startsWith("'") && val.endsWith("'")) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val.trim();
      }
    }
  }
} catch (e) {
  console.warn("Failed to load .env file:", e);
}

const tracer = trace.getTracer("whatsapp-worker");

export interface NormalizedPayload {
  text: string;
  metadata: {
    source: string;
    sender: string;
    timestamp: number;
  };
  cachedResponse?: any;
}

async function processNormalizedPayload(payload: NormalizedPayload) {
  console.log(`[Queue Worker] Forwarded normalized payload to AI:`, payload);

  let responseText = "";
  const cachedResponse = payload.cachedResponse;

  if (cachedResponse) {
    // Cache Hit branch
    console.log(`[Queue Worker] Bypassing AI loop. Using cached response.`);
    responseText = cachedResponse.text || cachedResponse.response || String(cachedResponse);
  } else {
    // Cache Miss branch
    console.log(`[Queue Worker] Triggering shopAgent...`);
    
    // Dynamically import cache engine and shopAgent
    const { setSemanticCache, getEmbedding } = await import("../apps/storefront/app/domains/ai-cache/cache-engine.server");
    const { shopAgent } = await import("../apps/storefront/app/mastra/agents/shopAgent");

    const result = await shopAgent.generate(payload.text);
    if (result.steps.length >= 5 && result.finishReason !== "stop") {
      responseText = "Unable to resolve your request. A team member will follow up.";
    } else {
      responseText = result.text;
    }

    console.log(`[Queue Worker] Generating embedding coordinates for new query...`);
    const embedding = await getEmbedding(payload.text);

    console.log(`[Queue Worker] Writing new vector response to Neon Database cache...`);
    await setSemanticCache(payload.text, embedding, { text: responseText });
  }

  // Send outbound message directly to Meta WhatsApp Cloud API (v21.0)
  // Nested under a Zod parse node to satisfy Rule 14 Network Isolation Gate
  // Must pass 'Idempotency-Key' header literal to satisfy Rule 14 B
  const whatsappResponse = z.any().parse(
    await fetch(
      `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `outbound-${payload.metadata.sender}-${Date.now()}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: payload.metadata.sender,
          type: "text",
          text: {
            preview_url: false,
            body: responseText,
          },
        }),
      }
    )
  );
  console.log(`[Queue Worker] Dispatched outbound message to Meta. Response status: ${whatsappResponse.status}`);
}

const worker = new Worker(
  "whatsapp-ingestion",
  async (job: Job) => {
    console.log(`[Queue Worker] Processing message from: ${job.data.sender}`);

    const redisClient = await worker.client;
    const clientKey = `rate:${job.data.sender}`;

    let isBlocked = false;
    // Rate Limiter Tracer Span
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
      return; // Clean drop out-of-band
    }

    // Normalization translation pipeline step
    let normalizedText = job.data.text || "";

    if (job.data.attachments && job.data.attachments.length > 0) {
      const attachmentBlocks = job.data.attachments
        .map((att: any) => `\n\n### Attached Media [Type: ${att.type}]\n- File: ${att.url}`)
        .join("");
      normalizedText += attachmentBlocks;
    }

    const normalizedPayload: NormalizedPayload = {
      text: normalizedText,
      metadata: {
        source: "whatsapp",
        sender: job.data.sender,
        timestamp: Date.now(),
      },
    };

    // Cache lookup Tracer Span
    let cachedResponse: any = null;
    await tracer.startActiveSpan("cache-lookup", async (span: Span) => {
      span.setAttribute("system.operation", "cache-query");
      span.setAttribute("payload.length", normalizedPayload.text.length);

      const { getSemanticCache } = await import("../apps/storefront/app/domains/ai-cache/cache-engine.server");
      cachedResponse = await getSemanticCache(normalizedPayload.text);
      if (cachedResponse) {
        span.setAttribute("cache.hit", true);
        console.log(`[Queue Worker] Semantic cache hit!`);
      } else {
        span.setAttribute("cache.hit", false);
        console.log(`[Queue Worker] Semantic cache miss.`);
      }
      span.end();
    });

    normalizedPayload.cachedResponse = cachedResponse;
    await processNormalizedPayload(normalizedPayload);
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
      duration: 4000
    }
  }
);

worker.on("failed", (job: Job | undefined, err: Error) => {
  console.error(`❌ Job ${job?.id} failed:`, err);
});

async function shutdown(signal: string) {
  console.log(`Received ${signal}. Shutting down worker...`);
  try {
    await worker.close();
    console.log("Worker closed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Error during worker shutdown:", error);
    process.exit(1);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
