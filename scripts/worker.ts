import { Worker, type Job } from "bullmq";

const worker = new Worker(
  "whatsapp-ingestion",
  async (job: Job) => {
    console.log(`[Queue Worker] Processing message from: ${job.data.sender}`);
    // Downstream AI extraction foundations go here next!
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
