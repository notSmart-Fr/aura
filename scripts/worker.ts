import { Worker, type Job } from "bullmq";
// dummy edit to trigger watcher (v3)

export interface NormalizedPayload {
  text: string;
  metadata: {
    source: string;
    sender: string;
    timestamp: number;
  };
}

function processNormalizedPayload(payload: NormalizedPayload) {
  console.log(`[Queue Worker] Forwarded normalized payload to AI:`, payload);
}

const worker = new Worker(
  "whatsapp-ingestion",
  async (job: Job) => {
    console.log(`[Queue Worker] Processing message from: ${job.data.sender}`);
    
    const redisClient = await worker.client;
    const clientKey = `rate:${job.data.sender}`;

    // Atomic operations directly on local hardware memory
    const currentRequests = await redisClient.incr(clientKey);
    if (currentRequests === 1) {
      await redisClient.expire(clientKey, 10);
    }

    if (currentRequests > 5) {
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

    processNormalizedPayload(normalizedPayload);
  },
  {
    connection: {
      host: "127.0.0.1",
      port: 6379,
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
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
    console.log("Worker closed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Error during worker shutdown:", error);
    process.exit(1);
  }
}


process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
