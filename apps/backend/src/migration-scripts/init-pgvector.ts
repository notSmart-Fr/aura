import { MedusaContainer } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function init_pgvector({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const dbConnection = container.resolve(ContainerRegistrationKeys.PG_CONNECTION);

  logger.info("Initializing pgvector database schema...");

  try {
    // 1. Enable pgvector extension
    await dbConnection.raw(`CREATE EXTENSION IF NOT EXISTS vector;`);
    logger.info("pgvector extension verified/enabled.");

    // 2. Create the product_embeddings table
    await dbConnection.raw(`
      CREATE TABLE IF NOT EXISTS product_embeddings (
        id VARCHAR(255) PRIMARY KEY,
        product_id VARCHAR(255) UNIQUE NOT NULL,
        handle VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        embedding vector(1536),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    logger.info("product_embeddings table verified/created.");

    // 3. Create HNSW Index for cosine similarity operations
    await dbConnection.raw(`
      CREATE INDEX IF NOT EXISTS product_embeddings_hnsw_idx 
      ON product_embeddings USING hnsw (embedding vector_cosine_ops);
    `);
    logger.info("HNSW index on product_embeddings verified/created.");

    logger.info("pgvector database migration completed successfully.");
  } catch (error) {
    logger.error("Failed to run pgvector migration script", error);
    throw error;
  }
}
