import { Agent } from '@mastra/core/agent';

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
  id: 'payload-extractor',
  name: 'Payload Extractor',
  instructions: systemInstructions,
  model: 'google/gemini-2.0-flash'
});

export async function extractPayloadData(payload: NormalizedPayload): Promise<string | undefined> {
  // The prefix instructions and extraction schemas remain static and identical.
  // The volatile user message text is appended at the absolute suffix of the template expression.
  const prompt = `System instructions: Analyze the following user payload.
Required Output JSON Schema:
${extractionJsonSchema}

User message to analyze:
${payload.text}`;

  const response = await extractorAgent.generate(prompt);
  return response.text;
}
