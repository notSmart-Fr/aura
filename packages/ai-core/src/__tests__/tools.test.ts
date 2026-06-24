import { afterEach, describe, expect, it, vi } from "vitest";

import { ExploreProductInputSchema } from "../tools/exploreProductTool.js";
import { SearchCatalogInputSchema } from "../tools/searchCatalogTool.js";

const mockRunVendureQuery = vi.fn();

vi.mock("../vendure-client.js", () => ({
  runVendureQuery: (...args: unknown[]) => mockRunVendureQuery(...args),
}));

describe("catalog tool schemas", () => {
  it("accepts valid search catalog input", () => {
    const parsed = SearchCatalogInputSchema.parse({ term: "minimalist jacket" });
    expect(parsed.term).toBe("minimalist jacket");
  });

  it("rejects search terms that are too short", () => {
    expect(() => SearchCatalogInputSchema.parse({ term: "a" })).toThrow();
  });

  it("accepts valid explore product input", () => {
    const parsed = ExploreProductInputSchema.parse({ slug: "architectural-overcoat" });
    expect(parsed.slug).toBe("architectural-overcoat");
  });

  it("rejects empty explore product slug", () => {
    expect(() => ExploreProductInputSchema.parse({ slug: "" })).toThrow();
  });
});

describe("searchCatalogTool execute", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("maps Vendure searchCatalog items into storefront product cards", async () => {
    mockRunVendureQuery.mockResolvedValue({
      searchCatalog: {
        items: [
          {
            productId: "42",
            productName: "Architectural Overcoat",
            slug: "architectural-overcoat",
            description: "Structured wool overcoat",
            productAsset: { preview: "https://cdn.example/overcoat.jpg" },
          },
        ],
      },
    });

    const { searchCatalogTool } = await import("../tools/searchCatalogTool.js");
    const result = await searchCatalogTool.execute({ term: "overcoat" });

    expect(mockRunVendureQuery).toHaveBeenCalledOnce();
    expect(result.products).toEqual([
      {
        id: "42",
        title: "Architectural Overcoat",
        handle: "architectural-overcoat",
        description: "Structured wool overcoat",
        thumbnail: "https://cdn.example/overcoat.jpg",
      },
    ]);
  });
});
