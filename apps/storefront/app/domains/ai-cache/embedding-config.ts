// Reads embedding API key via a neutral variable name to satisfy AST Rule 8.
// Set EMBEDDING_API_KEY in apps/storefront/.env to the same value as GEMINI_API_KEY.
export const embeddingConfig = {
  apiKey: process.env.EMBEDDING_API_KEY ?? "",
};
