/**
 * Vendure pgvector setup
 *
 * Product embeddings live on `product.customFieldsEmbedding` (vector 768).
 * Run `scripts/enable-vector.ts` against the Vendure Postgres database, or use
 * `docker-compose up` which applies `docker/init-db.sql` automatically.
 */
export default async function initPgvector(): Promise<void> {
  console.log(
    "[init-pgvector] Medusa migration removed. Use scripts/enable-vector.ts or docker/init-db.sql.",
  );
}
