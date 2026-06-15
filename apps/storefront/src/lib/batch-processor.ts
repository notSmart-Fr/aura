import { generateEmbedding, upsertProductEmbedding } from "./embeddings";

interface BatchOptions {
  batchSize: number;
  delayMs?: number;
}

/**
 * Generic chunking utility to process arrays in strict, controlled sequential blocks to respect API rate limits.
 */
export async function processInBatches<T>(
  items: T[],
  batchSize: number,
  callback: (batch: T[]) => Promise<void>
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await callback(batch);
  }
}

/**
 * Process products in chunks/batches to respect embedding API rate limits.
 * Avoids wrapping an open .map(embed) inside Promise.all directly.
 */
export async function batchProcessEmbeddings(
  products: { id: string; description: string }[],
  options: BatchOptions = { batchSize: 5, delayMs: 100 }
): Promise<void> {
  const { batchSize, delayMs } = options;

  await processInBatches(products, batchSize, async (chunk) => {
    // Process items in the current batch concurrently, but limited to the batch size
    const promises = chunk.map(async (product) => {
      // Create embedding via text description
      await upsertProductEmbedding(product.id, product.description);
    });

    await Promise.all(promises);

    if (delayMs) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  });
}
