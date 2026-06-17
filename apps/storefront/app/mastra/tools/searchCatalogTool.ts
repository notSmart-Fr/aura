import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const SearchCatalogInputSchema = z.object({
  term: z.string().min(2).max(150).describe('The natural style customer search term')
});

export const searchCatalogTool = createTool({
  id: 'searchCatalog',
  description: 'Search for storefront products in Vendure catalog using semantic lookups',
  inputSchema: SearchCatalogInputSchema,
  execute: async ({ input }) => {
    const graphqlQuery = `
      query SearchCatalog($input: SearchInput!) {
        searchCatalog(input: $input) {
          items {
            productId
            productName
            slug
            description
            productAsset {
              preview
            }
          }
        }
      }
    `;

    const response = await fetch(process.env.VENDURE_API_URL || 'http://localhost:3000/shop-api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: graphqlQuery,
        variables: { input: { term: input.term, take: 5 } }
      })
    });

    const json = await response.json();
    if (json.errors) throw new Error(json.errors[0].message);

    return {
      products: (json.data.searchCatalog?.items || []).map((item: any) => ({
        id: item.productId,
        title: item.productName,
        handle: item.slug,
        description: item.description,
        thumbnail: item.productAsset?.preview,
      }))
    };
  }
});
