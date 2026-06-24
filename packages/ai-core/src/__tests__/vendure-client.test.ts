import { afterEach, describe, expect, it, vi } from "vitest";

describe("runVendureQuery", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("returns typed data on a successful GraphQL response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: {
            searchCatalog: {
              items: [{ productId: "1", productName: "Overcoat" }],
            },
          },
        }),
      }),
    );

    const { runVendureQuery } = await import("../vendure-client.js");
    const data = await runVendureQuery<{ searchCatalog: { items: unknown[] } }>(
      "query { searchCatalog { items { productId } } }",
    );

    expect(data.searchCatalog.items).toHaveLength(1);
  });

  it("throws IntegrationError when Vendure returns HTTP 500", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      }),
    );

    const { runVendureQuery } = await import("../vendure-client.js");

    await expect(runVendureQuery("query { products { items { id } } }")).rejects.toMatchObject({
      code: "UPSTREAM_API_ERROR",
    });
  });

  it("throws IntegrationError when GraphQL returns errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          errors: [{ message: "Invalid query" }],
        }),
      }),
    );

    const { runVendureQuery } = await import("../vendure-client.js");

    await expect(runVendureQuery("query { invalid }")).rejects.toMatchObject({
      code: "UPSTREAM_API_ERROR",
      message: "Invalid query",
    });
  });
});
