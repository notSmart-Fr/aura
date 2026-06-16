export async function deepseekGenerateObject<T>(options: {
  prompt: string;
  schemaDescription: string;
}): Promise<{ object: T }> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY environment variable is not defined.");
  }

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a helper that outputs structured JSON data matching the user's requested schema. Instructions: ${options.schemaDescription}`
        },
        {
          role: "user",
          content: options.prompt
        }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} - ${text}`);
  }

  const data = await response.json();
  const rawJson = data.choices?.[0]?.message?.content || "{}";
  const parsed = JSON.parse(rawJson) as T;
  return { object: parsed };
}
