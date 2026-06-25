import { trace, type Span } from "@opentelemetry/api";
import { z } from "zod";
import Redis from "ioredis";
import { Kysely, PostgresDialect, sql } from "kysely";
import { RequestContext } from "@mastra/core/request-context";

import { getSemanticCache, setSemanticCache, getEmbedding } from "./cache-engine.js";
import { expandProductGraph, formatGraphContext } from "./graph-retriever.js";
import { extractPayloadData } from "./extractor.js";
import { shopAgent } from "./agents/shopAgent.js";
import { getDbPool } from "./db-pool.js";
import { logger } from "./logger.js";
import {
  messagesProcessed,
  cacheHits,
  pipelineDuration,
} from "./metrics.js";

const tracer = trace.getTracer("orchestrator-service");

const ConversationTurnSchema = z.object({
  role: z.enum(["user", "model"]),
  content: z.string(),
});
const SessionHistorySchema = z.array(ConversationTurnSchema);
type ConversationTurn = z.infer<typeof ConversationTurnSchema>;

const SESSION_TTL_SECONDS = 1800;

function buildSessionKey(channel: string, platformUserId: string): string {
  return `session:${channel}:${platformUserId}`;
}

export { buildSessionKey };

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

export interface ProcessIntentInput {
  text: string;
  channel: string;
  platformUserId: string;
  vendureToken?: string | null;
}

export interface ProcessIntentResult {
  text: string;
  toolResults?: unknown[];
  fromCache?: boolean;
}

const CachedAgentResponseSchema = z.object({
  text: z.string(),
  toolResults: z.array(z.unknown()).optional(),
});

const FALLBACK_RESPONSE =
  "Unable to resolve your request. A team member will follow up.";

function isSemanticCacheEnabled(): boolean {
  const flag = process.env.SEMANTIC_CACHE_ENABLED;
  return flag === undefined || flag === "true" || flag === "1";
}

export class OrchestratorService {
  private readonly redis: Redis;
  private db: Kysely<VendureDatabase> | null = null;

  constructor() {
    this.redis = new Redis({
      host: "127.0.0.1",
      port: 6379,
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
    });
  }

  private async getHistory(
    channel: string,
    platformUserId: string,
  ): Promise<ConversationTurn[]> {
    const raw = await this.redis.get(buildSessionKey(channel, platformUserId));
    if (!raw) {
      return [];
    }
    return SessionHistorySchema.parse(JSON.parse(raw));
  }

  private async appendTurns(
    channel: string,
    platformUserId: string,
    turns: ConversationTurn[],
  ): Promise<void> {
    const validatedTurns = SessionHistorySchema.parse(turns);
    const key = buildSessionKey(channel, platformUserId);
    const existing = await this.getHistory(channel, platformUserId);
    const updated = SessionHistorySchema.parse([
      ...existing,
      ...validatedTurns,
    ]);
    await this.redis.set(
      key,
      JSON.stringify(updated),
      "EX",
      SESSION_TTL_SECONDS,
    );
  }

  private async getDbConnection(): Promise<Kysely<VendureDatabase>> {
    if (!this.db) {
      const pool = getDbPool();
      this.db = new Kysely<VendureDatabase>({
        dialect: new PostgresDialect({ pool }),
      });
    }
    return this.db;
  }

  async processIntent(input: ProcessIntentInput): Promise<ProcessIntentResult> {
    const { text, channel, platformUserId } = input;

    const sessionHistory = await this.getHistory(channel, platformUserId);

    if (isSemanticCacheEnabled()) {
      const cacheResult = await tracer.startActiveSpan(
        "semantic-cache-lookup",
        async (span: Span) => {
          span.setAttribute("system.operation", "semantic-cache-lookup");
          try {
            const cached = await getSemanticCache(text);
            if (cached === null) {
              span.setAttribute("cache.hit", false);
              return null;
            }

            const parsed = CachedAgentResponseSchema.safeParse(cached);
            if (!parsed.success) {
              cacheHits.add(1, { layer: "semantic", hit: "false" });
              span.setAttribute("cache.hit", false);
              span.setAttribute("cache.invalid", true);
              return null;
            }

            cacheHits.add(1, { layer: "semantic", hit: "true" });
            span.setAttribute("cache.hit", true);
            return parsed.data;
          } catch (cacheErr: unknown) {
            const msg =
              cacheErr instanceof Error ? cacheErr.message : String(cacheErr);
            logger.warn({ err: msg }, "Semantic cache lookup failed (non-fatal)");
            cacheHits.add(1, { layer: "semantic", hit: "false" });
            span.setAttribute("cache.error", msg);
            return null;
          } finally {
            span.end();
          }
        },
      );

      if (cacheResult) {
        messagesProcessed.add(1, { channel, status: "cached" });
        await this.appendTurns(channel, platformUserId, [
          { role: "user", content: text },
          { role: "model", content: cacheResult.text },
        ]);

        return {
          text: cacheResult.text,
          toolResults: cacheResult.toolResults,
          fromCache: true,
        };
      }
    }

    let hydratedText = text;
    let queryEmbedding: number[] | null = null;

    await tracer.startActiveSpan("context-hydration", async (span: Span) => {
      span.setAttribute("system.operation", "context-hydration");
      span.setAttribute("payload.length", text.length);
      const hydrationStart = Date.now();

      try {
        const database = await this.getDbConnection();

        logger.debug("Generating embedding coordinates for query");
        const embedding = await getEmbedding(text);
        queryEmbedding = embedding;
        const vectorLiteral = `[${embedding.join(",")}]`;

        logger.debug("Executing Kysely vector similarity search");
        const matchedProducts = (await database
          .selectFrom("product as p")
          .innerJoin("product_translation as pt", "pt.baseId", "p.id")
          .select(["p.id", "pt.name", "pt.slug", "pt.description"])
          .where("p.deletedAt", "is", null)
          .orderBy(
            sql`p."customFieldsEmbedding" <=> cast(${vectorLiteral} as vector)`,
            "asc",
          )
          .limit(3)
          .execute()) as unknown as MatchedProduct[];

        if (matchedProducts.length > 0) {
          const productIds = matchedProducts.map((p: MatchedProduct) => p.id);
          const rawPool = getDbPool();

          logger.debug("Querying pg Pool for live variant context");
          const variantResult = await rawPool.query(
            `SELECT id, "productId", price, sku, enabled FROM product_variant WHERE "productId" = ANY($1) AND "deletedAt" IS NULL`,
            [productIds],
          );
          const variants = variantResult.rows;

          const contextBlocks = matchedProducts
            .map((p: MatchedProduct) => {
              const pVariants = variants.filter(
                (v: MatchedVariant) => v.productId === p.id,
              );
              const variantDetails = pVariants
                .map(
                  (v: MatchedVariant) =>
                    `SKU: ${v.sku}, Price: $${(v.price / 100).toFixed(2)}, Available: ${v.enabled ? "Yes" : "No"}`,
                )
                .join(" | ");
              return `[Product: ${p.name}, Slug: ${p.slug}, Description: ${p.description}, Variants: {${variantDetails}}]`;
            })
            .join("\n");

          let graphContext = "";
          await tracer.startActiveSpan(
            "graph-expand",
            async (graphSpan: Span) => {
              graphSpan.setAttribute("seed_count", matchedProducts.length);
              try {
                const graphs = await expandProductGraph(
                  rawPool,
                  matchedProducts,
                  embedding,
                  2,
                );

                await tracer.startActiveSpan(
                  "graph-hop-2",
                  async (hopSpan: Span) => {
                    hopSpan.setAttribute(
                      "paired_found",
                      graphs.reduce((c, g) => c + g.pairedProducts.length, 0),
                    );
                    hopSpan.end();
                  },
                );

                graphContext = formatGraphContext(graphs);
                graphSpan.setAttribute("graph_nodes", graphs.length);
                graphSpan.setAttribute("context_length", graphContext.length);

                if (graphContext) {
                  const pairedCount = graphs.reduce((c, g) => c + g.pairedProducts.length, 0);
                  logger.info({ pairedCount }, "Graph expansion enriched context");
                  pipelineDuration.record(Date.now() - hydrationStart, { stage: "graph-expand" });
                }
              } catch (graphErr: unknown) {
                const msg =
                  graphErr instanceof Error
                    ? graphErr.message
                    : String(graphErr);
                logger.warn({ err: msg }, "Graph expansion failed (non-fatal)");
                graphSpan.setAttribute("graph_error", msg);
              } finally {
                graphSpan.end();
              }
            },
          );

          const fullContext = [contextBlocks, graphContext]
            .filter(Boolean)
            .join("\n");

          hydratedText = `${text}\n\n[Live Storefront Catalog Context (Grounding Only - do not output raw tables/lists):\n${fullContext}]`;
          logger.info("Layered context hydration completed (vector + graph)");
          pipelineDuration.record(Date.now() - hydrationStart, { stage: "context-hydration" });
        }
      } catch (err: unknown) {
        logger.error({ err }, "Context hydration failed");
        throw err;
      } finally {
        span.end();
      }
    });

    if (channel === "whatsapp") {
      try {
        const classification = await extractPayloadData({
          text,
          metadata: {
            source: "whatsapp",
            sender: platformUserId,
            timestamp: Date.now(),
          },
        });

        if (classification) {
          hydratedText = `${hydratedText}\n\n[Inbound Classification (Grounding Only):\n${JSON.stringify(classification)}]`;
        }
      } catch (extractErr: unknown) {
        const msg =
          extractErr instanceof Error ? extractErr.message : String(extractErr);
        logger.warn({ err: msg }, "Payload extraction failed (non-fatal)");
      }
    }

    const agentMessages = [
      ...sessionHistory.map((turn: ConversationTurn) => ({
        role:
          turn.role === "model" ? ("assistant" as const) : ("user" as const),
        content: turn.content,
        id: crypto.randomUUID(),
        createdAt: new Date(),
      })),
      {
        role: "user" as const,
        content: hydratedText,
        id: crypto.randomUUID(),
        createdAt: new Date(),
      },
    ];

    logger.info("Triggering shopAgent");
    const requestContext = new RequestContext();
    requestContext.set("vendureToken", input.vendureToken ?? null);
    const result = await shopAgent.generate(agentMessages, { requestContext });

    const responseText =
      result.steps.length >= 5 && result.finishReason !== "stop"
        ? FALLBACK_RESPONSE
        : result.text;

    const toolResults = result.toolResults ?? [];
    const isFallback = responseText === FALLBACK_RESPONSE;

    messagesProcessed.add(1, { channel, status: isFallback ? "ai_fallback" : "ai_ok" });

    if (
      isSemanticCacheEnabled() &&
      !isFallback
    ) {
      const queryEmb = queryEmbedding as number[] | null;
      if (queryEmb !== null && queryEmb.length > 0) {
        const cacheWriteStart = Date.now();
        await tracer.startActiveSpan("semantic-cache-write", async (span: Span) => {
          span.setAttribute("system.operation", "semantic-cache-write");
          try {
            await setSemanticCache(text, queryEmb, {
            text: responseText,
            toolResults,
          });
          span.setAttribute("cache.stored", true);
          pipelineDuration.record(Date.now() - cacheWriteStart, { stage: "cache-write" });
        } catch (cacheErr: unknown) {
          const msg =
            cacheErr instanceof Error ? cacheErr.message : String(cacheErr);
          logger.warn({ err: msg }, "Semantic cache write failed (non-fatal)");
          span.setAttribute("cache.error", msg);
        } finally {
          span.end();
        }
      });
    }
    }

    await this.appendTurns(channel, platformUserId, [
      { role: "user", content: text },
      { role: "model", content: responseText },
    ]);

    return {
      text: responseText,
      toolResults,
      fromCache: false,
    };
  }

  async close(): Promise<void> {
    await this.redis.quit();
    if (this.db) {
      await getDbPool().end();
      logger.info("DB pool closed");
    }
  }
}
