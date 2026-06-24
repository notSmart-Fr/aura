import { apiConfig } from '../config';

export class GeminiEmbeddingService {
  async getEmbedding(text: string): Promise<number[]> {
    const apiKey = apiConfig.apiKey;
    if (!apiKey) {
      throw new Error("Missing Google Gemini API Key context inside the environment variables");
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'models/gemini-embedding-2',
            content: { parts: [{ text }] },
            outputDimensionality: 768,
          }),
        }
      );

      const json = await response.json();
      if (json.error) {
        throw new Error(json.error.message);
      }
      return json.embedding.values;
    } catch (error) {
      console.error('Failed to generate embedding with gemini-embedding-2:', error);
      throw error;
    }
  }
}

export const nativeGeminiClient = new GeminiEmbeddingService();
