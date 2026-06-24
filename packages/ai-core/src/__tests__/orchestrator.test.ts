import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGetSemanticCache = vi.fn();
const mockSetSemanticCache = vi.fn();
const mockGetEmbedding = vi.fn();
const mockExpandProductGraph = vi.fn();
const mockShopAgentGenerate = vi.fn();

vi.mock("../cache-engine.js", () => ({
  getSemanticCache: (...args: unknown[]) => mockGetSemanticCache(...args),
  setSemanticCache: (...args: unknown[]) => mockSetSemanticCache(...args),
  getEmbedding: (...args: unknown[]) => mockGetEmbedding(...args),
}));

vi.mock("../graph-retriever.js", () => ({
  expandProductGraph: (...args: unknown[]) => mockExpandProductGraph(...args),
  formatGraphContext: () => "",
}));

vi.mock("../agents/shopAgent.js", () => ({
  shopAgent: {
    generate: (...args: unknown[]) => mockShopAgentGenerate(...args),
  },
}));

vi.mock("ioredis", () => ({
  default: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    quit: vi.fn().mockResolvedValue("OK"),
  })),
}));

vi.mock("typeorm", () => ({
  DataSource: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn().mockResolvedValue(undefined),
    driver: {
      master: {
        query: vi.fn().mockResolvedValue({
          rows: [
            {
              id: 10,
              productId: 1,
              sku: "COAT-M",
              price: 89000,
              enabled: true,
            },
          ],
        }),
      },
    },
  })),
}));

vi.mock("kysely", () => ({
  Kysely: vi.fn().mockImplementation(() => ({
    selectFrom: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue([
      {
        id: 1,
        name: "Architectural Overcoat",
        slug: "architectural-overcoat",
        description: "Structured wool overcoat",
      },
    ]),
  })),
  PostgresDialect: vi.fn(),
  sql: (...args: unknown[]) => args,
}));

import { buildSessionKey, OrchestratorService } from "../orchestrator.js";
import { z } from "zod";

const CachedAgentResponseSchema = z.object({
  text: z.string(),
  toolResults: z.array(z.unknown()).optional(),
});

describe("OrchestratorService helpers", () => {
  it("builds deterministic Redis session keys", () => {
    expect(buildSessionKey("web", "user-123")).toBe("session:web:user-123");
    expect(buildSessionKey("whatsapp", "+15551234567")).toBe(
      "session:whatsapp:+15551234567",
    );
  });

  it("parses cached agent payloads used by semantic cache", () => {
    const parsed = CachedAgentResponseSchema.parse({
      text: "Here are a few options.",
      toolResults: [{ products: [{ handle: "t-shirt" }] }],
    });

    expect(parsed.text).toContain("options");
    expect(parsed.toolResults).toHaveLength(1);
  });

  it("rejects malformed cached payloads", () => {
    expect(() => CachedAgentResponseSchema.parse({ toolResults: [] })).toThrow();
  });
});

describe("OrchestratorService.processIntent", () => {
  let orchestrator: OrchestratorService;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SEMANTIC_CACHE_ENABLED = "true";
    orchestrator = new OrchestratorService();
    mockGetEmbedding.mockResolvedValue([0.1, 0.2, 0.3]);
    mockSetSemanticCache.mockResolvedValue(undefined);
    mockShopAgentGenerate.mockResolvedValue({
      text: "Here are a few tailored options.",
      steps: [],
      finishReason: "stop",
      toolResults: [],
    });
  });

  afterEach(async () => {
    await orchestrator.close();
  });

  it("returns fromCache true when semantic cache hits", async () => {
    mockGetSemanticCache.mockResolvedValue({
      text: "Cached concierge reply.",
      toolResults: [],
    });

    const result = await orchestrator.processIntent({
      text: "show me coats",
      channel: "web",
      platformUserId: "user-cache-hit",
    });

    expect(result.fromCache).toBe(true);
    expect(result.text).toBe("Cached concierge reply.");
    expect(mockShopAgentGenerate).not.toHaveBeenCalled();
  });

  it("continues when graph expansion fails", async () => {
    mockGetSemanticCache.mockResolvedValue(null);
    mockExpandProductGraph.mockRejectedValue(new Error("graph traversal unavailable"));

    const result = await orchestrator.processIntent({
      text: "recommend an overcoat",
      channel: "web",
      platformUserId: "user-graph-fail",
    });

    expect(result.fromCache).toBe(false);
    expect(result.text).toBe("Here are a few tailored options.");
    expect(mockShopAgentGenerate).toHaveBeenCalled();
  });
});
