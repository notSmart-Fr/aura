import { describe, expect, it } from "vitest";

import {
  expandProductGraph,
  formatGraphContext,
  type ProductSeed,
} from "../graph-retriever.js";

describe("expandProductGraph", () => {
  it("returns variant and paired product graph context for seed products", async () => {
    const seeds: ProductSeed[] = [
      {
        id: 1,
        name: "Classic Cotton T-Shirt",
        slug: "t-shirt",
        description: "Classic cotton tee",
      },
    ];

    const pool = {
      query: async (sql: string) => {
        if (sql.includes("product_variant")) {
          return {
            rows: [
              {
                id: 10,
                productId: 1,
                sku: "SHIRT-S-BLACK",
                price: 1500,
                enabled: true,
              },
            ],
          };
        }

        return {
          rows: [
            {
              id: 2,
              name: "Classic Sweatshirt",
              slug: "sweatshirt",
              description: "Cozy sweatshirt",
            },
          ],
        };
      },
    };

    const graphs = await expandProductGraph(pool, seeds, [0.1, 0.2, 0.3], 2);

    expect(graphs).toHaveLength(1);
    expect(graphs[0].variants).toHaveLength(1);
    expect(graphs[0].pairedProducts[0]?.slug).toBe("sweatshirt");
    expect(formatGraphContext(graphs)).toContain("Related products: Classic Sweatshirt");
  });

  it("returns an empty array when no seeds are provided", async () => {
    const pool = { query: async () => ({ rows: [] }) };
    const graphs = await expandProductGraph(pool, [], [0.1], 2);
    expect(graphs).toEqual([]);
  });
});
