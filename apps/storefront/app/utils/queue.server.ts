import { Queue } from "bullmq";

export const ingestionQueue = new Queue("whatsapp-ingestion", {
  connection: {
    host: "127.0.0.1",
    port: 6379,
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
  },
});
