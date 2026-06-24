import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { runVendureQuery } from "../vendure-client.js";

export const SearchCatalogInputSchema = z.object({
  term: z.string().min(2).max(150).describe("The natural style customer search term"),
});

interface CatalogSearchItem {
  productId: string;
  productName: string;
  slug: string;
  description: string;
  productAsset?: {
    preview: string;
  } | null;
}

interface SearchCatalogData {
  searchCatalog?: {
    items: CatalogSearchItem[];
  };
}

export const searchCatalogTool = createTool({
  id: "searchCatalog",
  description: "Search for storefront products in Vendure catalog using semantic lookups",
  inputSchema: SearchCatalogInputSchema,
  execute: async (input) => {
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

    const data = await runVendureQuery<SearchCatalogData>(graphqlQuery, {
      input: { term: input.term, take: 5 },
    });

    return {
      products: (data.searchCatalog?.items ?? []).map((item) => ({
        id: item.productId,
        title: item.productName,
        handle: item.slug,
        description: item.description,
        thumbnail: item.productAsset?.preview,
      })),
    };
  },
});
