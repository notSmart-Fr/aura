import { trace, type Span } from "@opentelemetry/api";
import { z } from "zod";
import Redis from "ioredis";
import { DataSource } from "typeorm";
import { Kysely, PostgresDialect, sql } from "kysely";

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

interface RawPool {
  query(sql: string, params: number[]): Promise<{ rows: MatchedVariant[] }>;
}

export interface ProcessIntentInput {
  text: string;
  channel: string;
  platformUserId: string;
}

export class OrchestratorService {
  private readonly redis: Redis;
  private db: Kysely<VendureDatabase> | null = null;
  private dataSource: DataSource | null = null;

  constructor() {
    this.redis = new Redis({
      host: "127.0.0.1",
      port: 6379,
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
    });
  }

  private async getHistory(channel: string, platformUserId: string): Promise<ConversationTurn[]> {
    const raw = await this.redis.get(buildSessionKey(channel, platformUserId));
    if (!raw) {
      return [];
    }
    return SessionHistorySchema.parse(JSON.parse(raw));
  }

  private async appendTurns(
    channel: string,
    platformUserId: string,
    turns: ConversationTurn[]
  ): Promise<void> {
    const validatedTurns = SessionHistorySchema.parse(turns);
    const key = buildSessionKey(channel, platformUserId);
    const existing = await this.getHistory(channel, platformUserId);
    const updated = SessionHistorySchema.parse([...existing, ...validatedTurns]);
    await this.redis.set(key, JSON.stringify(updated), "EX", SESSION_TTL_SECONDS);
  }

  private async bootstrapDataSource(): Promise<DataSource> {
    const dataSource = new DataSource({
      type: "postgres",
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      username: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
      database: process.env.DB_NAME || "vendure",
      ssl:
        process.env.DB_HOST && process.env.DB_HOST !== "localhost"
          ? { rejectUnauthorized: false }
          : false,
      synchronize: false,
      logging: false,
    });
    await dataSource.initialize();
    return dataSource;
  }

  private async getDbConnection(): Promise<{ db: Kysely<VendureDatabase>; dataSource: DataSource }> {
    if (!this.db) {
      this.dataSource = await this.bootstrapDataSource();
      const rawPool = (this.dataSource.driver as { master: unknown }).master;
      this.db = new Kysely<VendureDatabase>({
        dialect: new PostgresDialect({ pool: rawPool }),
      });
    }
    return { db: this.db, dataSource: this.dataSource as DataSource };
  }

  async processIntent(input: ProcessIntentInput): Promise<string[]> {
    const { text, channel, platformUserId } = input;

    const sessionHistory = await this.getHistory(channel, platformUserId);

    let hydratedText = text;

    await tracer.startActiveSpan("context-hydration", async (span: Span) => {
      span.setAttribute("system.operation", "context-hydration");
      span.setAttribute("payload.length", text.length);

      try {
        const { db: database, dataSource } = await this.getDbConnection();
        const { getEmbedding } = await import(
          "../../../../../apps/storefront/app/domains/ai-cache/cache-engine.server"
        );

        console.log(`[OrchestratorService] Generating embedding coordinates for query...`);
        const embedding = await getEmbedding(text);
        const vectorLiteral = `[${embedding.join(",")}]`;

        console.log(`[OrchestratorService] Executing Kysely vector similarity search...`);
        const matchedProducts = await database
          .selectFrom("product as p")
          .innerJoin("product_translation as pt", "pt.baseId", "p.id")
          .select(["p.id", "pt.name", "pt.slug", "pt.description"])
          .where("p.deletedAt", "is", null)
          .orderBy(
            sql`p."customFieldsEmbedding" <=> cast(${vectorLiteral} as vector)`,
            "asc"
          )
          .limit(3)
          .execute() as unknown as MatchedProduct[];

        if (matchedProducts.length > 0) {
          const productIds = matchedProducts.map((p: MatchedProduct) => p.id);
          const rawPool = (dataSource.driver as { master: RawPool }).master;

          console.log(`[OrchestratorService] Querying pg Pool for live variant context...`);
          const variantResult = await rawPool.query(
            `SELECT id, "productId", price, sku, enabled FROM product_variant WHERE "productId" = ANY($1) AND "deletedAt" IS NULL`,
            [productIds]
          );
          const variants = variantResult.rows;

          const contextBlocks = matchedProducts
            .map((p: MatchedProduct) => {
              const pVariants = variants.filter((v: MatchedVariant) => v.productId === p.id);
              const variantDetails = pVariants
                .map(
                  (v: MatchedVariant) =>
                    `SKU: ${v.sku}, Price: $${(v.price / 100).toFixed(2)}, Available: ${v.enabled ? "Yes" : "No"}`
                )
                .join(" | ");
              return `[Product: ${p.name}, Slug: ${p.slug}, Description: ${p.description}, Variants: {${variantDetails}}]`;
            })
            .join("\n");

          hydratedText = `${text}\n\n[Live Storefront Catalog Context (Grounding Only - do not output raw tables/lists):\n${contextBlocks}]`;
          console.log(`[OrchestratorService] Layered context hydration completed.`);
        }
      } catch (err) {
        console.error(`[OrchestratorService] Context hydration failed:`, err);
        throw err;
      } finally {
        span.end();
      }
    });

    const { shopAgent } = await import(
      "../../../../../apps/storefront/app/mastra/agents/shopAgent"
    );

    const agentMessages = [
      ...sessionHistory.map((turn: ConversationTurn) => ({
        role: turn.role === "model" ? ("assistant" as const) : ("user" as const),
        content: turn.content,
      })),
      { role: "user" as const, content: hydratedText },
    ];

    console.log(`[OrchestratorService] Triggering shopAgent...`);
    const result = await shopAgent.generate(agentMessages);

    const responseText =
      result.steps.length >= 5 && result.finishReason !== "stop"
        ? "Unable to resolve your request. A team member will follow up."
        : result.text;

    await this.appendTurns(channel, platformUserId, [
      { role: "user", content: text },
      { role: "model", content: responseText },
    ]);

    return [responseText];
  }

  async close(): Promise<void> {
    await this.redis.quit();
    if (this.dataSource) {
      await this.dataSource.destroy();
      console.log("[OrchestratorService] TypeORM DataSource closed.");
    }
  }
}
