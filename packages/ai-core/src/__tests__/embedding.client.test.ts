import { afterEach, describe, expect, it, vi } from "vitest";

describe("getEmbedding", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.resetModules();
    vi.doUnmock("../embedding-config.js");
  });

  it("returns embedding values for a valid Gemini response", async () => {
    vi.doMock("../embedding-config.js", () => ({
      embeddingConfig: { apiKey: "test-key" },
    }));

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          embedding: { values: [0.1, 0.2, 0.3] },
        }),
      }),
    );

    const { getEmbedding } = await import("../embedding.client.js");
    const values = await getEmbedding("minimalist jacket");
    expect(values).toEqual([0.1, 0.2, 0.3]);
  });

  it("throws IntegrationError when API key is missing", async () => {
    vi.doMock("../embedding-config.js", () => ({
      embeddingConfig: { apiKey: "" },
    }));

    const { getEmbedding } = await import("../embedding.client.js");

    await expect(getEmbedding("test query")).rejects.toMatchObject({
      code: "CONFIG_MISSING",
    });
  });

  it("throws IntegrationError when Gemini returns an error payload", async () => {
    vi.doMock("../embedding-config.js", () => ({
      embeddingConfig: { apiKey: "test-key" },
    }));

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          error: {
            message: "quota exceeded",
            code: 429,
            status: "RESOURCE_EXHAUSTED",
          },
        }),
      }),
    );

    const { getEmbedding } = await import("../embedding.client.js");

    await expect(getEmbedding("test query")).rejects.toMatchObject({
      code: "UPSTREAM_API_ERROR",
    });
  });
});
