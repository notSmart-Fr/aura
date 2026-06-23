import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

/**
 * ProductEmbedding
 *
 * Custom TypeORM entity that maps the pgvector embedding column for
 * Vendure Products. By specifying `type: 'vector'` natively, TypeORM's
 * Postgres driver generates a proper `vector(768)` column instead of a
 * text or float array, eliminating the need for `::vector` casting hacks
 * in raw SQL queries.
 *
 * Dimensions: 768 — matches gemini-embedding-2 output.
 */
@Entity({ name: 'product' })
export class ProductEmbedding {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * Maps to the Vendure-managed `customFieldsEmbedding` column.
   * TypeORM will treat this as a native `vector(768)` column type,
   * enabling direct use of the `<=>` cosine similarity operator in
   * QueryBuilder without raw casting.
   */
  @Column({
    name: 'customFieldsEmbedding',
    type: 'vector', // Tells TypeORM's Postgres driver to generate a native vector column
    length: 768,    // Configures the precise dimensionality array size
    nullable: true,
  })
  customFieldsEmbedding: number[];
}
