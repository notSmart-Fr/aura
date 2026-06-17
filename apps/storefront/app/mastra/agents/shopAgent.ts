import { Agent } from '@mastra/core/agent';
import { searchCatalogTool } from '../tools/searchCatalogTool';
import { modifyCart } from '../tools/modifyCart';
import { showRecommendations } from '../tools/showRecommendations';

export const shopAgent = new Agent({
  id: 'shop-curator',
  name: 'Shop Curator',
  instructions: `
    You are a luxury storefront shopping assistant.
    Your sole task is to understand user intents, convert them into exact tool parameters, and call them.
    CRITICAL: Never generate raw markdown tables, bulleted lists, or raw summaries of products in your conversational text output. The storefront rendering layer will capture the 'toolResults' array and display them natively.
  `,
  model: {
    provider: 'DEEPSEEK',
    name: 'deepseek-chat',
  },
  tools: {
    searchCatalog: searchCatalogTool,
    showRecommendations,
    modifyCart
  }
});
