import { z } from "zod";

import { IntegrationError } from "./errors.js";
import { embeddingConfig } from "./embedding-config.js";

const GeminiEmbeddingResponseSchema = z.union([
  z.object({
    embedding: z.object({
      values: z.array(z.number()),
    }),
  }),
  z.object({
    error: z.object({
      message: z.string(),
      code: z.number().optional(),
      status: z.string().optional(),
    }),
  }),
]);

export async function getEmbedding(text: string): Promise<number[]> {
  const cleanText = text.replace(/\s+/g, " ").trim();

  if (!embeddingConfig.apiKey) {
    throw new IntegrationError(
      "CONFIG_MISSING",
      "Missing EMBEDDING_API_KEY in environment",
      { key: "EMBEDDING_API_KEY" },
    );
  }

  const parsed = GeminiEmbeddingResponseSchema.safeParse(
    await (async () => {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${embeddingConfig.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": `embed-${cleanText.length}-${Date.now()}`,
          },
          body: JSON.stringify({
            model: "models/gemini-embedding-2",
            content: { parts: [{ text: cleanText }] },
            outputDimensionality: 768,
          }),
        },
      );

      if (!response.ok) {
        throw new IntegrationError(
          "NETWORK_HTTP_FAILURE",
          `Embedding request failed with HTTP ${response.status}`,
          { status: response.status, length: cleanText.length },
        );
      }

      return response.json();
    })(),
  );

  if (!parsed.success) {
    throw new IntegrationError(
      "SCHEMA_MISALIGNMENT",
      "Embedding response did not match expected schema",
      { issues: parsed.error.flatten() },
    );
  }

  if ("error" in parsed.data) {
    throw new IntegrationError(
      "UPSTREAM_API_ERROR",
      `Gemini embedding failed: ${parsed.data.error.message}`,
      {
        code: parsed.data.error.code,
        status: parsed.data.error.status,
        length: cleanText.length,
      },
    );
  }

  return parsed.data.embedding.values;
}
