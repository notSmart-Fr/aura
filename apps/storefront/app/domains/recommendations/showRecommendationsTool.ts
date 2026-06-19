import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const ShowRecommendationsInputSchema = z.object({
  intro: z.string().max(500).describe('A refined, brand-aligned introductory text for the user'),
  productHandles: z.array(z.string().max(100)).describe('List of product slugs/handles to display'),
  outro: z.string().max(500).describe('A polite, contextual call-to-action closing phrase')
});

export const showRecommendations = createTool({
  id: 'showRecommendations',
  description: 'Retrieve detailed information for products to display visually in the UI recommendations drawer',
  inputSchema: ShowRecommendationsInputSchema,
  execute: async (input) => {
    const graphqlQuery = `
      query GetProducts($slugs: [String!]!) {
        products(options: { filter: { slug: { in: $slugs } } }) {
          items {
            id
            name
            slug
            description
            featuredAsset { preview }
            variants {
              id
              name
              price
              stockLevel
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
        variables: { slugs: input.productHandles }
      })
    });

    const json = await response.json();
    if (json.errors) throw new Error(json.errors[0].message);

    return {
      success: true,
      intro: input.intro,
      products: (json.data.products?.items || []).map((item: any) => ({
        id: item.id,
        title: item.name,
        handle: item.slug,
        description: item.description,
        thumbnail: item.featuredAsset?.preview,
        variants: (item.variants || []).map((v: any) => ({
          id: v.id,
          title: v.name,
          price: v.price,
          stockLevel: v.stockLevel
        }))
      })),
      outro: input.outro
    };
  }
});
