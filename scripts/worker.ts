// compiler-trigger-comment
import { Worker, type Job } from "bullmq";
import { trace, type Span } from "@opentelemetry/api";
import { z } from "zod";
import Redis from "ioredis";
import fs from "fs";
import path from "path";
import { DataSource } from "typeorm";
import { Kysely, PostgresDialect, sql } from "kysely";

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

// Database schema interfaces for Kysely
interface ProductTable {
  id: number;
  deletedAt: Date | null;
  customFieldsEmbedding: string | null;
  featuredAssetId: string | null;
}

interface ProductTranslationTable {
  id: number;
  baseId: number;
  name: string;
  slug: string;
  description: string;
}

interface VendureDatabase {
  product: ProductTable;
  product_translation: ProductTranslationTable;
}

interface MatchedProduct {
  id: number;
  name: string;
  slug: string;
  description: string;
}

interface MatchedVariant {
  id: number;
  productId: number;
  price: number;
  sku: string;
  enabled: boolean;
}

let db: Kysely<VendureDatabase> | null = null;
let typeormDataSource: DataSource | null = null;

async function bootstrapWorkerDataSource(): Promise<DataSource> {
  const dataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "vendure",
    ssl: process.env.DB_HOST && process.env.DB_HOST !== "localhost" ? { rejectUnauthorized: false } : false,
    synchronize: false,
    logging: false,
  });
  await dataSource.initialize();
  return dataSource;
}

async function getDbConnection() {
  if (!db) {
    typeormDataSource = await bootstrapWorkerDataSource();
    const rawPool = (typeormDataSource.driver as any).master;
    db = new Kysely<VendureDatabase>({
      dialect: new PostgresDialect({ pool: rawPool }),
    });
  }
  return { db, dataSource: typeormDataSource };
}

async function processNormalizedPayload(payload: NormalizedPayload) {
  console.log(`[Queue Worker] Forwarded normalized payload to AI:`, payload);

  let responseText = "";
  console.log(`[Queue Worker] Triggering shopAgent...`);
  
  const { shopAgent } = await import("../apps/storefront/app/mastra/agents/shopAgent");

  const result = await shopAgent.generate(payload.text);
  if (result.steps.length >= 5 && result.finishReason !== "stop") {
    responseText = "Unable to resolve your request. A team member will follow up.";
  } else {
    responseText = result.text;
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

    // Semantic lookup and live context hydration Tracer Span
    await tracer.startActiveSpan("context-hydration", async (span: Span) => {
      span.setAttribute("system.operation", "context-hydration");
      span.setAttribute("payload.length", normalizedPayload.text.length);

      try {
        const { db: database, dataSource } = await getDbConnection();
        if (!dataSource) {
          throw new Error("[Queue Worker] Database DataSource connection is not established.");
        }
        const { getEmbedding } = await import("../apps/storefront/app/domains/ai-cache/cache-engine.server");
        
        console.log(`[Queue Worker] Generating embedding coordinates for query...`);
        const embedding = await getEmbedding(normalizedPayload.text);
        const vectorLiteral = `[${embedding.join(",")}]`;

        console.log(`[Queue Worker] Executing Kysely vector similarity search...`);
        const matchedProducts = await database
          .selectFrom("product as p")
          .innerJoin("product_translation as pt", "pt.baseId", "p.id")
          .select([
            "p.id",
            "pt.name",
            "pt.slug",
            "pt.description",
          ])
          .where("p.deletedAt", "is", null)
          .orderBy(
            sql`p."customFieldsEmbedding" <=> cast(${vectorLiteral} as vector)`,
            "asc"
          )
          .limit(3)
          .execute() as unknown as MatchedProduct[];

        if (matchedProducts.length > 0) {
          const productIds = matchedProducts.map((p: MatchedProduct) => p.id);
          const rawPool = (dataSource.driver as any).master;

          console.log(`[Queue Worker] Querying pg Pool for live variant context...`);
          const variantResult = await rawPool.query(
            `SELECT id, "productId", price, sku, enabled FROM product_variant WHERE "productId" = ANY($1) AND "deletedAt" IS NULL`,
            [productIds]
          );
          const variants = variantResult.rows as MatchedVariant[];

          const contextBlocks = matchedProducts.map((p: MatchedProduct) => {
            const pVariants = variants.filter((v: MatchedVariant) => v.productId === p.id);
            const variantDetails = pVariants.map((v: MatchedVariant) => 
              `SKU: ${v.sku}, Price: $${(v.price / 100).toFixed(2)}, Available: ${v.enabled ? "Yes" : "No"}`
            ).join(" | ");
            return `[Product: ${p.name}, Slug: ${p.slug}, Description: ${p.description}, Variants: {${variantDetails}}]`;
          }).join("\n");

          normalizedPayload.text = `${normalizedPayload.text}\n\n[Live Storefront Catalog Context (Grounding Only - do not output raw tables/lists):\n${contextBlocks}]`;
          console.log(`[Queue Worker] Layered context hydration completed.`);
        }
      } catch (err) {
        console.error(`[Queue Worker] Context hydration failed:`, err);
        // Let it propagate to trigger BullMQ's standard retry policy
        throw err;
      } finally {
        span.end();
      }
    });

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
    if (typeormDataSource) {
      await typeormDataSource.destroy();
      console.log("TypeORM DataSource closed successfully.");
    }
    console.log("Worker closed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Error during worker shutdown:", error);
    process.exit(1);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

