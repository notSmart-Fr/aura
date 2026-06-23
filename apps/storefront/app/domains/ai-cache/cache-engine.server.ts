import pg from 'pg';

import { DatabaseDomainError, IntegrationError } from '../common/errors.ts';
import { getEmbedding } from './embedding.client.ts';

const { Pool } = pg;

const dbUrl = process.env.PAYLOAD_DATABASE_URL;
const pool = new Pool({
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

export { getEmbedding };

export async function getSemanticCache(text: string): Promise<unknown | null> {
  const startedAt = Date.now();
  const embedding = await getEmbedding(text);
  const vectorStr = `[${embedding.join(',')}]`;

  const client = await pool.connect();
  try {
    // raw SQL query targeting cache_embeddings containing the <=> operator (enforced by Rule 16 AST gate)
    const result = await client.query(
      'SELECT response_json, (embedding <=> $1::vector) as distance FROM ai_cache.cache_embeddings ORDER BY embedding <=> $1::vector LIMIT 1',
      [vectorStr]
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      const distance = parseFloat(row.distance);
      if (distance < 0.05) {
        return row.response_json;
      }
    }
    return null;
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error instanceof DatabaseDomainError || error instanceof IntegrationError) {
        throw error;
      }
      throw new DatabaseDomainError(
        'GRAPH_TRAVERSAL_FAILED',
        `Semantic cache lookup failed: ${error.message}`,
        { method: 'getSemanticCache', duration: Date.now() - startedAt }
      );
    }
    throw new DatabaseDomainError(
      'GRAPH_TRAVERSAL_FAILED',
      'Semantic cache lookup failed: Unknown cache read failure',
      { method: 'getSemanticCache', duration: Date.now() - startedAt }
    );
  } finally {
    client.release();
  }
}

export async function setSemanticCache(text: string, embedding: number[], responseJson: unknown): Promise<void> {
  const startedAt = Date.now();
  const vectorStr = `[${embedding.join(',')}]`;

  const client = await pool.connect();
  try {
    await client.query(
      'INSERT INTO ai_cache.cache_embeddings (text, embedding, response_json) VALUES ($1, $2::vector, $3)',
      [text, vectorStr, JSON.stringify(responseJson)]
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error instanceof DatabaseDomainError || error instanceof IntegrationError) {
        throw error;
      }
      throw new DatabaseDomainError(
        'CACHE_WRITE_FAILED',
        `Semantic cache write failed: ${error.message}`,
        { method: 'setSemanticCache', length: embedding.length, duration: Date.now() - startedAt }
      );
    }
    throw new DatabaseDomainError(
      'CACHE_WRITE_FAILED',
      'Semantic cache write failed: Unknown cache write failure',
      { method: 'setSemanticCache', length: embedding.length, duration: Date.now() - startedAt }
    );
  } finally {
    client.release();
  }
}
