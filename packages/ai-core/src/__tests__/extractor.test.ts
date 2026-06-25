import { describe, expect, it, vi } from "vitest";

vi.mock("../agents/shopAgent.js", () => ({
  shopAgent: {
    generate: vi.fn(),
  },
}));

import { ExtractionSchema, extractPayloadData } from "../extractor.js";

describe("ExtractionSchema", () => {
  it("accepts valid extraction data", () => {
    const data = {
      classification: "inquiry",
      entities: ["coat", "winter"],
      urgency: "medium",
    };
    expect(() => ExtractionSchema.parse(data)).not.toThrow();
    const parsed = ExtractionSchema.parse(data);
    expect(parsed.classification).toBe("inquiry");
    expect(parsed.entities).toEqual(["coat", "winter"]);
    expect(parsed.urgency).toBe("medium");
  });

  it("rejects missing required fields", () => {
    const data = { classification: "inquiry" };
    expect(() => ExtractionSchema.parse(data)).toThrow();
  });

  it("rejects invalid classification enum value", () => {
    const data = {
      classification: "spam",
      entities: [],
      urgency: "low",
    };
    expect(() => ExtractionSchema.parse(data)).toThrow();
  });

  it("rejects invalid urgency enum value", () => {
    const data = {
      classification: "order",
      entities: ["dress"],
      urgency: "critical",
    };
    expect(() => ExtractionSchema.parse(data)).toThrow();
  });
});
