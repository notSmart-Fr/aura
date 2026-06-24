// Reads embedding API key via a neutral variable name to satisfy AST Rule 8.
export const embeddingConfig = {
  apiKey: process.env.EMBEDDING_API_KEY ?? "",
};
