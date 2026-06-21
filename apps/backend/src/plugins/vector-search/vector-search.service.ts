import { Injectable } from '@nestjs/common';
import { TransactionalConnection } from '@vendure/core';
import { Kysely, PostgresDialect, sql } from 'kysely';
import type { Pool } from 'pg';
import { VendureDatabase } from './database.types';

export type CatalogSearchResult = {
  id: number;
  name: string;
  slug: string;
  description: string;
  featuredAssetId: string | null;
};

/**
 * VectorSearchService
 *
 * Wraps Kysely around TypeORM's existing pg.Pool — zero additional connection
 * sockets. Kysely handles the vector similarity query exclusively; TypeORM
 * continues to own all standard Vendure CRUD operations.
 *
 * Pool extraction: TypeORM 0.3.x PostgresDriver exposes the underlying
 * pg.Pool as `driver.master`.
 * // ponytail: cast through `any` to avoid patching TypeORM's internal types.
 * Upgrade path: when TypeORM exports a stable PostgresDriver type, replace
 * the `as any` cast with a proper import.
 */
@Injectable()
export class VectorSearchService {
  private readonly db: Kysely<VendureDatabase>;

  constructor(private readonly connection: TransactionalConnection) {
    // Extract the underlying pg.Pool from TypeORM's PostgresDriver.
    // ponytail: driver.master is the internal pool reference in TypeORM 0.3.x.
    const pool = (this.connection.rawConnection.driver as any).master as Pool;

    this.db = new Kysely<VendureDatabase>({
      dialect: new PostgresDialect({ pool }),
    });
  }

  /**
   * performSemanticSearch
   *
   * Executes a pgvector cosine similarity search using Kysely's sql`` helper
   * for the <=> operator fragment. The vectorLiteral is interpolated by Kysely
   * as a parameterized binding ($1) — not string concatenation — so there is
   * no SQL injection surface even though it appears inline in the template.
   */
  async performSemanticSearch(
    vector: number[],
    limit: number
  ): Promise<CatalogSearchResult[]> {
    // Built from a number[] (Gemini API output) — no user string content here.
    const vectorLiteral = `[${vector.join(',')}]`;

    const rows = await this.db
      .selectFrom('product as p')
      .innerJoin('product_translation as pt', 'pt.baseId', 'p.id')
      .select([
        'p.id',
        'pt.name',
        'pt.slug',
        'pt.description',
        'p.featuredAssetId',
      ])
      .where('p.deletedAt', 'is', null)
      // sql`` interpolates vectorLiteral as a parameterized value ($1) while
      // preserving the cast(... as vector) fragment that pgvector requires.
      .orderBy(
        sql`p."customFieldsEmbedding" <=> cast(${vectorLiteral} as vector)`,
        'asc'
      )
      .limit(limit)
      .execute();

    // Cast is safe: Kysely's select list matches CatalogSearchResult exactly.
    return rows as unknown as CatalogSearchResult[];
  }
}
