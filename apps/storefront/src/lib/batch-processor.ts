import { generateEmbedding, upsertProductEmbedding, ProductEmbedding } from "./embeddings";

interface BatchOptions {
  batchSize: number;
  delayMs?: number;
}

/**
 * Process products in chunks/batches to respect embedding API rate limits.
 * Avoids wrapping an open .map(embed) inside Promise.all directly.
 */
export async function batchProcessEmbeddings(
  dbConnection: any,
  products: { id: string; handle: string; title: string; description: string }[],
  options: BatchOptions = { batchSize: 5, delayMs: 100 }
): Promise<void> {
  const { batchSize, delayMs } = options;

  for (let i = 0; i < products.length; i += batchSize) {
    const chunk = products.slice(i, i + batchSize);

    // Concurrency throttle: process a limited batch sequentially or in controlled parallel
    const promises = chunk.map(async (product) => {
      const vector = await generateEmbedding(product.description);
      const data: ProductEmbedding = {
        productId: product.id,
        handle: product.handle,
        title: product.title,
        description: product.description,
        embedding: vector
      };
      await upsertProductEmbedding(dbConnection, data);
    });

    // Resolve the chunk's promises (safe since chunk is small/throttled)
    await Promise.all(promises);

    if (delayMs && i + batchSize < products.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
