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

    const VendureResponseSchema = z.object({
      data: z.object({
        products: z.object({
          items: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
              slug: z.string(),
              description: z.string(),
              featuredAsset: z.object({
                preview: z.string(),
              }).nullable().optional(),
              variants: z.array(
                z.object({
                  id: z.string(),
                  name: z.string(),
                  price: z.number(),
                  stockLevel: z.any().optional().nullable(),
                })
              ),
            })
          ),
        }).nullable().optional(),
      }),
    });

    const parsed = VendureResponseSchema.parse(
      await (await fetch(process.env.VENDURE_API_URL || 'http://localhost:3000/shop-api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: graphqlQuery,
          variables: { slugs: input.productHandles }
        })
      })).json()
    );

    return {
      success: true,
      intro: input.intro,
      products: (parsed.data.products?.items || []).map((item) => ({
        id: item.id,
        title: item.name,
        handle: item.slug,
        description: item.description,
        thumbnail: item.featuredAsset?.preview,
        variants: (item.variants || []).map((v) => ({
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
