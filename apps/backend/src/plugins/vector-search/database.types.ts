import { Generated } from 'kysely';

/**
 * Kysely database schema — scoped to only the tables touched by
 * the VectorSearchPlugin. Verified against the live working raw SQL:
 *   JOIN product_translation pt ON pt."baseId" = p.id
 * Vendure uses snake_case for this table on PostgreSQL.
 */

interface ProductTable {
  id: Generated<number>;
  deletedAt: Date | null;
  /** Stored as pgvector vector(768); pg driver transmits as text string. */
  customFieldsEmbedding: string | null;
  featuredAssetId: string | null;
}

interface ProductTranslationTable {
  id: Generated<number>;
  /** Foreign key — maps to product.id, quoted "baseId" on disk. */
  baseId: number;
  name: string;
  slug: string;
  description: string;
}

export interface VendureDatabase {
  product: ProductTable;
  // Verified: Vendure physically names this table product_translation (snake_case).
  product_translation: ProductTranslationTable;
}
