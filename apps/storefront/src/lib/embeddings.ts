/**
 * Product Embeddings Service
 * Interface for generating product description embeddings, storing them in PostgreSQL/pgvector,
 * and performing cosine-similarity semantic vector queries.
 */

export interface ProductEmbedding {
  productId: string;
  handle: string;
  title: string;
  description: string;
  embedding: number[];
  updatedAt?: Date;
}

/**
 * Generate vector embedding for a given text snippet (e.g., product description).
 * Uses an external embedding model API (like OpenAI text-embedding-3-small).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Stub: Implement API call to your vector model provider here
  // Example: OpenAI, Cohere, or local transformer model
  const dimension = 1536;
  return Array.from({ length: dimension }, () => Math.random() - 0.5);
}

/**
 * Store or update a product embedding in the PostgreSQL database.
 */
export async function upsertProductEmbedding(
  dbConnection: any,
  data: ProductEmbedding
): Promise<void> {
  const embeddingString = `[${data.embedding.join(",")}]`;
  
  await dbConnection.query(
    `INSERT INTO product_embeddings (id, product_id, handle, title, description, embedding, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6::vector, CURRENT_TIMESTAMP)
     ON CONFLICT (product_id) 
     DO UPDATE SET 
       handle = EXCLUDED.handle,
       title = EXCLUDED.title,
       description = EXCLUDED.description,
       embedding = EXCLUDED.embedding,
       updated_at = CURRENT_TIMESTAMP`,
    [
      data.productId, // primary key
      data.productId,
      data.handle,
      data.title,
      data.description,
      embeddingString
    ]
  );
}

/**
 * Performs a semantic search querying the pgvector table.
 * Returns Medusa product IDs sorted by cosine similarity score.
 */
export async function querySemanticProducts(
  dbConnection: any,
  queryVector: number[],
  limit: number = 8
): Promise<{ productId: string; handle: string; title: string; score: number }[]> {
  const queryVectorString = `[${queryVector.join(",")}]`;

  const result = await dbConnection.query(
    `SELECT product_id, handle, title, (1 - (embedding <=> $1::vector)) AS score
     FROM product_embeddings
     ORDER BY embedding <=> $1::vector
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
