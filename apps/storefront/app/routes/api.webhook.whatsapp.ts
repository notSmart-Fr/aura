import { type LoaderFunctionArgs, type ActionFunctionArgs, json } from "@remix-run/node";
import crypto from "node:crypto";
import { z } from "zod";
import { ingestionQueue } from "../utils/queue.server";

// Zod schema for standard Meta webhook verification GET handshake
const WhatsappHandshakeSchema = z.object({
  "hub.mode": z.string().max(50),
  "hub.verify_token": z.string().max(100),
  "hub.challenge": z.string().max(100),
});

// Zod schema for incoming WhatsApp webhook POST payload (Meta API format)
const WhatsappWebhookPayloadSchema = z.object({
  object: z.string().max(100),
  entry: z.array(
    z.object({
      id: z.string().max(100),
      changes: z.array(
        z.object({
          value: z.object({
            messaging_product: z.string().max(50),
            metadata: z.object({
              display_phone_number: z.string().max(50),
              phone_number_id: z.string().max(50),
            }),
            contacts: z.array(
              z.object({
                profile: z.object({
                  name: z.string().max(100),
                }),
                wa_id: z.string().max(50),
              })
            ).optional(),
            messages: z.array(
              z.object({
                from: z.string().max(50),
                id: z.string().max(100),
                timestamp: z.string().max(50),
                type: z.string().max(50),
                text: z.object({
                  body: z.string().max(5000),
                }).optional(),
                image: z.object({
                  id: z.string().max(100),
                  mime_type: z.string().max(100),
                  sha256: z.string().max(100),
                }).optional(),
                video: z.object({
                  id: z.string().max(100),
                  mime_type: z.string().max(100),
                  sha256: z.string().max(100),
                }).optional(),
                document: z.object({
                  id: z.string().max(100),
                  mime_type: z.string().max(100),
                  sha256: z.string().max(100),
                  filename: z.string().max(255).optional(),
                }).optional(),
                audio: z.object({
                  id: z.string().max(100),
                  mime_type: z.string().max(100),
                  sha256: z.string().max(100),
                }).optional(),
              })
            ).optional(),
          }),
          field: z.string().max(50),
        })
      ),
    })
  ),
});

/**
 * GET loader: Handles standard Meta verification handshake
 */
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams.entries());

    // Strict validation of handshake query parameters
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
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return new Response("Invalid request parameters", { status: 400 });
    }
    return new Response("Internal Server Error", { status: 500 });
  }
}

/**
 * POST action: Intercepts and processes incoming WhatsApp message webhooks
 */
export async function action({ request }: ActionFunctionArgs) {
  // Webhook auth verification and signature check sequence
  const authSignature = request.headers.get("x-hub-signature-256");
  if (!authSignature) {
    return new Response("Unauthorized signature", { status: 401 });
  }

  // Verify the payload using WHATSAPP_APP_SECRET
  const appSecret = process.env.WHATSAPP_APP_SECRET || "default_secret";
  const rawBody = await request.clone().text();
  const expectedSignature = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");

  // Validate signature parts (Meta signature format is usually: sha256=hash)
  const actualHash = authSignature.startsWith("sha256=") ? authSignature.slice(7) : authSignature;
  if (!crypto.timingSafeEqual(Buffer.from(actualHash, "utf8"), Buffer.from(expectedSignature, "utf8"))) {
    return new Response("Forbidden: Signature mismatch", { status: 403 });
  }

  try {
    const body = await request.json();
    
    // Strict schema parse validation at the perimeter before queue dispatch
    const parsedBody = WhatsappWebhookPayloadSchema.parse(body);

    // Process parsed entries and dispatch to BullMQ queue
    for (const entry of parsedBody.entry) {
      for (const change of entry.changes) {
        const { value } = change;
        if (value.messages) {
          for (const message of value.messages) {
            const sender = message.from;
            const text = message.text?.body || "";
            
            // Extract media parameters if available
            const attachments: Array<{ type: string; url: string }> = [];
            if (message.image) {
              attachments.push({
                type: "image",
                url: `https://platform.whatsapp.com/media/${message.image.id}`,
              });
            }
            if (message.video) {
              attachments.push({
                type: "video",
                url: `https://platform.whatsapp.com/media/${message.video.id}`,
              });
            }
            if (message.document) {
              attachments.push({
                type: "document",
                url: `https://platform.whatsapp.com/media/${message.document.id}`,
              });
            }
            if (message.audio) {
              attachments.push({
                type: "audio",
                url: `https://platform.whatsapp.com/media/${message.audio.id}`,
              });
            }

            // Dispatch job to Redis BullMQ queue
            await ingestionQueue.add("message", {
              sender,
              text,
              attachments,
              channel: "whatsapp",
            });
          }
        }
      }
    }

    return new Response("EVENT_RECEIVED", { status: 200 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return new Response("Invalid payload schema", { status: 400 });
    }
    return new Response("Bad Request", { status: 400 });
  }
}
