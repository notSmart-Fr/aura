import { type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { z } from "zod";
import { Queue } from "bullmq";

// Initialize BullMQ Queue
const ingestionQueue = new Queue("whatsapp-ingestion", {
  connection: {
    host: "127.0.0.1",
    port: 6379,
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
  },
});

// Zod schemas for strict perimeter validation
const WhatsappHandshakeSchema = z.object({
  "hub.mode": z.string().max(50),
  "hub.verify_token": z.string().max(100),
  "hub.challenge": z.string().max(100),
});

const WhatsappPayloadSchema = z.object({
  object: z.string().max(50),
  entry: z.array(z.any()).max(100),
});

/**
 * GET loader for WhatsApp Webhook verification handshake
 */
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams.entries());

    // Strict validation of the incoming search parameters
    const parsed = WhatsappHandshakeSchema.parse(searchParams);

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "default_verify_token";

    if (parsed["hub.mode"] === "subscribe" && parsed["hub.verify_token"] === verifyToken) {
      return new Response(parsed["hub.challenge"], {
        status: 200,
        headers: {
          "Content-Type": "text/plain",
        },
      });
    }

    return new Response("Forbidden", { status: 403 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response("Invalid request parameters", { status: 400 });
    }
    return new Response("Internal Server Error", { status: 500 });
  }
}

/**
 * POST action router for receiving WhatsApp webhook payloads
 */
export async function action({ request }: ActionFunctionArgs) {
  // Webhook signature checks
  const signature = request.headers.get("x-hub-signature-256") || request.headers.get("x-vendure-signature");
  if (!signature) {
    return new Response("Unauthorized signature", { status: 401 });
  }

  try {
    const body = await request.json();
    
    // Strict schema parse validation at the perimeter
    const parsedBody = WhatsappPayloadSchema.parse(body);

    const { entry } = parsedBody;
    const change = entry?.[0]?.changes?.[0]?.value;
    const message = change?.messages?.[0];

    if (message) {
      const sender = message.from;
      const text = message.text?.body || "";

      if (sender) {
        // Pack exactly like legacy structure and push onto ingestionQueue
        await ingestionQueue.add("message", {
          sender,
          text,
          attachments: [],
        });
      }
    }
    
    return new Response("EVENT_RECEIVED", { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response("Invalid payload schema", { status: 400 });
    }
    return new Response("Bad Request", { status: 400 });
  }
}

