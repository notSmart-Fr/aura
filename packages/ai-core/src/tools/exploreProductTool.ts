import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const ExploreProductInputSchema = z.object({
  slug: z.string().min(1).max(200).describe("Product slug/handle to explore"),
});

export const exploreProduct = createTool({
  id: "exploreProduct",
  description:
    "Explore product details: variants, option groups, and related items via catalog search",
  inputSchema: ExploreProductInputSchema,
  execute: async (input) => {
    const graphqlQuery = `
      query ExploreProduct($slug: String!) {
        product(slug: $slug) {
          id
          name
          slug
          description
          featuredAsset { preview }
          assets { preview }
          optionGroups {
            id
            code
            name
            options { id code name }
          }
          variants {
            id
            name
            sku
            price
            stockLevel
            featuredAsset { preview }
          }
        }
        searchCatalog(input: { term: $slug, take: 6 }) {
          items { productId productName slug description productAsset { preview } }
        }
      }
    `;

    const VendureResponseSchema = z.object({
      data: z.object({
        product: z
          .object({
            id: z.string(),
            name: z.string(),
            slug: z.string(),
            description: z.string(),
            featuredAsset: z
              .object({ preview: z.string() })
              .nullable()
              .optional(),
            assets: z
              .array(z.object({ preview: z.string() }))
              .optional()
              .default([]),
            optionGroups: z
              .array(
                z.object({
                  id: z.string(),
                  code: z.string(),
                  name: z.string(),
                  options: z.array(
                    z.object({
                      id: z.string(),
                      code: z.string(),
                      name: z.string(),
                    }),
                  ),
                }),
              )
              .optional()
              .default([]),
            variants: z
              .array(
                z.object({
                  id: z.string(),
                  name: z.string(),
                  sku: z.string(),
                  price: z.number(),
                  stockLevel: z
                    .union([z.number(), z.string()])
                    .optional()
                    .nullable(),
                  featuredAsset: z
                    .object({ preview: z.string() })
                    .nullable()
                    .optional(),
                }),
              )
              .optional()
              .default([]),
          })
          .nullable()
          .optional(),
        searchCatalog: z
          .object({
            items: z.array(
              z.object({
                productId: z.string(),
                productName: z.string(),
                slug: z.string(),
                description: z.string(),
                productAsset: z
                  .object({ preview: z.string() })
                  .nullable()
                  .optional(),
              }),
            ),
          })
          .optional(),
      }),
    });

    const response = (await z.unknown().parseAsync(
      fetch(process.env.VENDURE_API_URL || "http://localhost:3000/shop-api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: graphqlQuery,
          variables: { slug: input.slug },
        }),
      }),
    )) as Response;

    const json = await response.json();
    if (json.errors) throw new Error(json.errors[0].message);

    const parsed = VendureResponseSchema.parse(json);
    const product = parsed.data.product;

    if (!product) {
      return {
        success: false,
        error: `Product with slug "${input.slug}" not found`,
      };
    }

    const related = (parsed.data.searchCatalog?.items || [])
      .filter((item) => item.slug !== input.slug)
      .slice(0, 5)
      .map((item) => ({
        id: item.productId,
        name: item.productName,
        slug: item.slug,
        description: item.description,
        thumbnail: item.productAsset?.preview,
      }));

    return {
      success: true,
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        thumbnail: product.featuredAsset?.preview,
        images: product.assets.map((a) => a.preview),
        optionGroups: product.optionGroups.map((og) => ({
          id: og.id,
          code: og.code,
          name: og.name,
          options: og.options.map((o) => ({
            id: o.id,
            code: o.code,
            name: o.name,
          })),
        })),
        variants: product.variants.map((v) => ({
          id: v.id,
          name: v.name,
          sku: v.sku,
          price: v.price,
          stockLevel: v.stockLevel,
          thumbnail: v.featuredAsset?.preview,
        })),
      },
      relatedProducts: related,
    };
  },
});
