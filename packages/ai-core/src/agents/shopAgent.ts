import { Agent } from "@mastra/core/agent";
import { createDeepSeek } from "@ai-sdk/deepseek";

import { searchCatalogTool } from "../tools/searchCatalogTool.js";
import { exploreProduct } from "../tools/exploreProductTool.js";
import { modifyCart } from "../tools/modifyCartTool.js";
import { showRecommendations } from "../tools/showRecommendationsTool.js";

const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY || "",
});

export const shopAgent = new Agent({
  id: "shop-curator",
  name: "Shop Curator",
  instructions: `
    You are a luxury storefront shopping assistant.
    Your sole task is to understand user intents, convert them into exact tool parameters, and call them.
    CRITICAL: Never generate raw markdown tables, bulleted lists, or raw summaries of products in your conversational text output. The storefront rendering layer will capture the 'toolResults' array and display them natively.
  `,
  model: deepseek("deepseek-chat"),
  // @ts-expect-error -- maxSteps supported at runtime, Mastra type defs may lag
  maxSteps: 5,
  tools: {
    searchCatalog: searchCatalogTool,
    exploreProduct,
    showRecommendations,
    modifyCart,
  },
});
