/**
 * Product Embeddings Service
 * Interface for generating product description embeddings, storing them in PostgreSQL/pgvector,
 * and performing cosine-similarity semantic vector queries.
 */

import { sdk, PAYLOAD_DATABASE_URL } from "./config";
import { HttpTypes } from "@medusajs/types";
import { Pool } from "pg";
import { google } from "@ai-sdk/google";
import { embed } from "ai";

export interface ProductEmbedding {
  productId: string;
  handle: string;
  title: string;
  description: string;
  embedding: number[];
  updatedAt?: Date;
}

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: PAYLOAD_DATABASE_URL,
    });
  }
  return pool;
}

/**
 * Generate vector embedding for a given text snippet (e.g., product description).
 * Uses an external embedding model API (like OpenAI text-embedding-3-small).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  let attempts = 0;
  const maxAttempts = 5;
  let delay = 2000;

  while (attempts < maxAttempts) {
    try {
      const { embedding } = await embed({
        model: google.embedding("gemini-embedding-2"),
        value: text,
      });
      return embedding.slice(0, 1536);
    } catch (error: any) {
      attempts++;
      if (attempts >= maxAttempts) throw error;
      console.warn(`Embedding failed (attempt ${attempts}/${maxAttempts}), retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
  throw new Error("Failed to generate embedding after retries");
}


/**
 * Combines a product's title, handle, description, and tags into a clean text block for the AI model to read.
 */
export function generateProductDescription(product: any): string {
  if (!product) return "";
  const title = product.title || "";
  const handle = product.handle || "";
  const description = product.description || "";
  const tags = Array.isArray(product.tags)
    ? product.tags.map((t: any) => t.value || t.name || t).join(", ")
    : "";
  
  const optionValues: string[] = []
  if (Array.isArray(product.options)) {
    product.options.forEach((opt: any) => {
      if (opt && opt.values && Array.isArray(opt.values)) {
        opt.values.forEach((v: any) => {
          const val = typeof v === "string" ? v : v.value
          if (val) optionValues.push(val)
        })
      }
    })
  }

  const optionsText = optionValues.length > 0 ? `Options: ${optionValues.join(", ")}` : ""
  
  return `Title: ${title}\nHandle: ${handle}\nDescription: ${description}\nTags: ${tags}\n${optionsText}`.trim();
}

let columnEnsured = false;
export async function ensureThumbnailColumn(pool: Pool) {
  if (columnEnsured) return;
  const client = await pool.connect();
  try {
    await client.query(`ALTER TABLE product_embeddings ADD COLUMN IF NOT EXISTS thumbnail TEXT;`);
    columnEnsured = true;
  } catch (err) {
    console.error("Error ensuring thumbnail column exists:", err);
  } finally {
    client.release();
  }
}

/**
 * Store or update a product embedding in the PostgreSQL database.
 */
export async function upsertProductEmbedding(
  productId: string,
  text: string
): Promise<void> {
  // 1. Fetch the product details from Medusa with options and values
  const response = await sdk.client.fetch<{ product: HttpTypes.StoreProduct }>(
    `/store/products/${productId}`,
    {
      query: { fields: "id,title,handle,description,thumbnail,tags,options,options.values" }
    }
  );
  
  const product = response?.product;
  if (!product) {
    throw new Error(`Product not found in Medusa: ${productId}`);
  }

  // Regenerate description to ensure options are always included
  const finalDescription = generateProductDescription(product);
  console.log(`[Embedding Service] finalDescription for product ${productId}:`, finalDescription)

  // 2. Call our AI embedding model provider
  const vector = await generateEmbedding(finalDescription);
  const embeddingString = `[${vector.join(",")}]`;

  // 3. Write/update inside the product_embeddings PostgreSQL table
  const dbPool = getDbPool();
  await ensureThumbnailColumn(dbPool);
  await dbPool.query(
    `INSERT INTO product_embeddings (id, product_id, handle, title, description, thumbnail, embedding, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::halfvec, CURRENT_TIMESTAMP)
     ON CONFLICT (product_id) 
     DO UPDATE SET 
       handle = EXCLUDED.handle,
       title = EXCLUDED.title,
       description = EXCLUDED.description,
       thumbnail = EXCLUDED.thumbnail,
       embedding = EXCLUDED.embedding,
       updated_at = CURRENT_TIMESTAMP`,
    [
      productId,
      productId,
      product.handle || "",
      product.title || "",
      finalDescription,
      product.thumbnail || "",
      embeddingString
    ]
  );
}

/**
 * Performs a semantic search querying the pgvector table.
 * Returns Medusa product IDs sorted by cosine similarity score.
 */
export async function querySemanticProducts(
  queryVector: number[],
  limit: number = 8
): Promise<{ productId: string; handle: string; title: string; score: number }[]> {
  const queryVectorString = `[${queryVector.join(",")}]`;
  const dbPool = getDbPool();

  const result = await dbPool.query(
    `SELECT product_id, handle, title, (1 - (embedding <=> $1::halfvec)) AS score
     FROM product_embeddings
     ORDER BY embedding <=> $1::halfvec
     LIMIT $2`,
    [queryVectorString, limit]
  );

  return result.rows.map((row: any) => ({
    productId: row.product_id,
    handle: row.handle,
    title: row.title,
    score: Number(row.score)
  }));
}
