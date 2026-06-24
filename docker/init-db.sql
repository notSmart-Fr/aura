CREATE EXTENSION IF NOT EXISTS vector;

CREATE SCHEMA IF NOT EXISTS ai_cache;

CREATE TABLE IF NOT EXISTS ai_cache.cache_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  embedding vector(768),
  response_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cache_embeddings_vector
  ON ai_cache.cache_embeddings
  USING hnsw (embedding vector_cosine_ops);
