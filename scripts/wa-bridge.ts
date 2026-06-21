import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
// @ts-ignore
import qrcode from "qrcode-terminal";
import { Queue } from "bullmq";
import Redis from "ioredis";

const ingestionQueue = new Queue("whatsapp-ingestion", {
  connection: {
    host: "127.0.0.1",
    port: 6379,
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
  },
});

// Redis Pub/Sub subscription client
const redisSubscriber = new Redis({
  host: "127.0.0.1",
  port: 6379,
});

// Initialize WhatsApp client with puppeteer options to ensure clean boot in developer environment
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-extensions"],
  },
});

// Render QR code on terminal for user connection
client.on("qr", (qr) => {
  console.log("[WhatsApp Bridge] Scan the QR code below to connect:");
  qrcode.generate(qr, { small: true });
});

// Notify when client is ready
client.on("ready", () => {
  console.log("[WhatsApp Bridge] Client is ready and authenticated!");

  // Subscribe to outbound messages channel
  redisSubscriber.subscribe("wa_outbound", (err) => {
    if (err) {
      console.error("[WhatsApp Bridge] Failed to subscribe to wa_outbound:", err);
    } else {
      console.log("[WhatsApp Bridge] Subscribed to wa_outbound channel.");
    }
  });
});

// Handle outbound messages received via Redis Pub/Sub
redisSubscriber.on("message", async (channel, message) => {
  if (channel === "wa_outbound") {
    try {
      const payload = JSON.parse(message);
      const { recipientId, text } = payload;
      if (recipientId && text) {
        console.log(`[WhatsApp Bridge] Dispatching outbound message to ${recipientId}: ${text}`);
        await client.sendMessage(recipientId, text);
      }
    } catch (err) {
      console.error("[WhatsApp Bridge] Error processing outbound Pub/Sub message:", err);
    }
  }
});

// Listen to incoming messages
client.on("message", async (msg) => {
  try {
    const sender = msg.from;
    const text = msg.body || "";
    const attachments: Array<{ type: string; url: string }> = [];

    // Extract raw media if attachment exists
    if (msg.hasMedia) {
      const media = await msg.downloadMedia();
      if (media) {
        attachments.push({
          type: media.mimetype,
          url: `data:${media.mimetype};base64,${media.data}`,
        });
      }
    }

    // Standardize data shape and dispatch task to BullMQ pipeline
    await ingestionQueue.add("message", {
      sender,
      text,
      attachments,
    });

    console.log(`[WhatsApp Bridge] Message from ${sender} successfully pushed to BullMQ.`);
  } catch (error) {
    console.error("[WhatsApp Bridge] Error processing message event:", error);
  }
});

// Initialize client
console.log("[WhatsApp Bridge] Starting WhatsApp Daemon Connector...");
client.initialize();
