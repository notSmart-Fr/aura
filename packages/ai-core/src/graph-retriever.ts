import { z } from "zod";

import { DatabaseDomainError } from "./errors.js";

export interface ProductSeed {
  id: number;
  name: string;
  slug: string;
  description: string;
}

export interface VariantNode {
  id: number;
  sku: string;
  price: number;
  enabled: boolean;
}

export interface PairedProduct {
  id: number;
  name: string;
  slug: string;
  description: string;
}

export interface GraphContext {
  product: ProductSeed;
  variants: VariantNode[];
  pairedProducts: PairedProduct[];
}

interface RawPool {
  query(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: Record<string, unknown>[] }>;
}

export async function expandProductGraph(
  pool: RawPool,
  seeds: ProductSeed[],
  seedEmbedding: number[] | null,
  maxHops: number = 2,
): Promise<GraphContext[]> {
  const startedAt = Date.now();

  try {
    const seedIds = seeds.map((s) => s.id);
    if (seedIds.length === 0) return [];

    const variantResult = await pool.query(
      `SELECT id, "productId", sku, price, enabled
       FROM product_variant
       WHERE "productId" = ANY($1) AND "deletedAt" IS NULL`,
      [seedIds],
    );

    let pairedResult: { rows: Record<string, unknown>[] } = { rows: [] };

    if (maxHops >= 2 && seedEmbedding && seedEmbedding.length > 0) {
      const vectorLiteral = `[${seedEmbedding.join(",")}]`;
      pairedResult = await pool.query(
        `SELECT p.id, pt.name, pt.slug, pt.description
         FROM product p
         JOIN product_translation pt ON pt."baseId" = p.id
         WHERE p."deletedAt" IS NULL
           AND p.id != ALL($1)
           AND p."customFieldsEmbedding" IS NOT NULL
         ORDER BY p."customFieldsEmbedding" <=> cast(${vectorLiteral} as vector)
         LIMIT 5`,
        [seedIds],
      );
    }

    return seeds.map((seed) => {
      const seedVariants: VariantNode[] = (
        variantResult.rows as Array<Record<string, unknown>>
      )
        .filter((r) => r.productId === seed.id)
        .map((r) => ({
          id: r.id as number,
          sku: r.sku as string,
          price: r.price as number,
          enabled: Boolean(r.enabled),
        }));

      const paired: PairedProduct[] = (
        pairedResult.rows as Array<Record<string, unknown>>
      ).map((r) => ({
        id: r.id as number,
        name: (r.name as string) || "",
        slug: (r.slug as string) || "",
        description: (r.description as string) || "",
      }));

      return {
        product: seed,
        variants: seedVariants,
        pairedProducts: paired,
      };
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error instanceof DatabaseDomainError) {
        throw error;
      }
      throw new DatabaseDomainError(
        "GRAPH_TRAVERSAL_FAILED",
        `Graph expansion failed: ${error.message}`,
        {
          method: "expandProductGraph",
          hops: maxHops,
          duration: Date.now() - startedAt,
        },
      );
    }
    throw new DatabaseDomainError(
      "GRAPH_TRAVERSAL_FAILED",
      "Graph expansion failed: Unknown error",
      { method: "expandProductGraph", duration: Date.now() - startedAt },
    );
  }
}

export function formatGraphContext(graphs: GraphContext[]): string {
  if (graphs.length === 0) return "";

  return graphs
    .map((g) => {
      const lines: string[] = [];
      lines.push(`[Product: ${g.product.name}]`);
      lines.push(`  Slug: ${g.product.slug}`);
      lines.push(`  Description: ${g.product.description}`);

      if (g.variants.length > 0) {
        lines.push(`  Variants:`);
        for (const v of g.variants) {
          lines.push(
            `    SKU: ${v.sku}, Price: $${(v.price / 100).toFixed(2)}, Available: ${v.enabled ? "Yes" : "No"}`,
          );
        }
      }

      if (g.pairedProducts.length > 0) {
        const names = g.pairedProducts.map((p) => p.name).join(", ");
        lines.push(`  Related products: ${names}`);
      }

      return lines.join("\n");
    })
    .join("\n\n");
}

export const GraphContextSchema = z.object({
  product: z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
    description: z.string(),
  }),
  variants: z.array(
    z.object({
      id: z.number(),
      sku: z.string(),
      price: z.number(),
      enabled: z.boolean(),
    }),
  ),
  pairedProducts: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      slug: z.string(),
      description: z.string(),
    }),
  ),
});

export const GraphRetrievalResultSchema = z.object({
  graphs: z.array(GraphContextSchema),
  formattedContext: z.string(),
});
