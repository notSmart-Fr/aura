import { Agent } from "@mastra/core/agent";
import { z } from "zod";
import { logger } from "./logger.js";

export const ExtractionSchema = z.object({
  classification: z.enum(["inquiry", "order", "support"]),
  entities: z.array(z.string()),
  urgency: z.enum(["high", "medium", "low"]),
});

export type ExtractionResult = z.infer<typeof ExtractionSchema>;

export interface NormalizedPayload {
  text: string;
  metadata: {
    source: string;
    sender: string;
    timestamp: number;
  };
}

const extractionJsonSchema = `{
  "classification": "inquiry | order | support",
  "entities": ["list of parsed keywords/entities"],
  "urgency": "high | medium | low"
}`;

const systemInstructions = `You are a professional apparel storefront extractor.
Extract the classification, entities, and urgency from the incoming user message.
Output MUST be raw JSON matching the following schema structure:
${extractionJsonSchema}
Do not include any markdown backticks.`;

const extractorAgent = new Agent({
  id: "payload-extractor",
  name: "Payload Extractor",
  instructions: systemInstructions,
  model: "google/gemini-2.0-flash",
});

export async function extractPayloadData(
  payload: NormalizedPayload,
): Promise<ExtractionResult | null> {
  const prompt = `System instructions: Analyze the following user payload.
Required Output JSON Schema:
${extractionJsonSchema}

User message to analyze:
${payload.text}`;

  const response = await extractorAgent.generate(prompt);
  const rawText = response.text;

  try {
    const cleaned = rawText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    return ExtractionSchema.parse(parsed);
  } catch {
    logger.warn(
      `[extractor] Failed to parse extraction result (non-fatal), raw: ${rawText.slice(0, 200)}`,
    );
    return null;
  }
}
