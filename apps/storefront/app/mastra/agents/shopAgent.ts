import { Agent } from '@mastra/core/agent';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { searchCatalogTool } from '../../domains/catalog/searchCatalogTool';
import { modifyCart } from '../../domains/cart/modifyCartTool';
import { showRecommendations } from '../../domains/recommendations/showRecommendationsTool';

const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY || '',
});

export const shopAgent = new Agent({
  id: 'shop-curator',
  name: 'Shop Curator',
  instructions: `
    You are a luxury storefront shopping assistant.
    Your sole task is to understand user intents, convert them into exact tool parameters, and call them.
    CRITICAL: Never generate raw markdown tables, bulleted lists, or raw summaries of products in your conversational text output. The storefront rendering layer will capture the 'toolResults' array and display them natively.
  `,
  model: deepseek('deepseek-chat'),
  maxSteps: 5,
  tools: {
    searchCatalog: searchCatalogTool,
    showRecommendations,
    modifyCart
  }
});
