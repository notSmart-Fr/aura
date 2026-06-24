import { describe, expect, it } from "vitest";

import { ExploreProductInputSchema } from "../tools/exploreProductTool.js";
import { SearchCatalogInputSchema } from "../tools/searchCatalogTool.js";

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
