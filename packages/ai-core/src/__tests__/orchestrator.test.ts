import { describe, expect, it } from "vitest";
import { z } from "zod";

import { buildSessionKey } from "../orchestrator.js";

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
