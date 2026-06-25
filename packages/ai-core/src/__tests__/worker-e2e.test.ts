import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockOrchestratorProcessIntent = vi.fn();
const mockOrchestratorClose = vi.fn();
const mockSdkShutdown = vi.fn();
const mockWorkerClose = vi.fn();

vi.mock("@dtc/ai-core/orchestrator", () => ({
  OrchestratorService: vi.fn().mockImplementation(() => ({
    processIntent: (...args: unknown[]) => mockOrchestratorProcessIntent(...args),
    close: (...args: unknown[]) => mockOrchestratorClose(...args),
  })),
}));

vi.mock("@dtc/ai-core/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("../../../../scripts/otel-bootstrap.ts", () => ({
  sdk: {
    shutdown: (...args: unknown[]) => mockSdkShutdown(...args),
  },
}));

vi.mock("../../../../scripts/load-env.ts", () => ({
  loadMonorepoEnv: vi.fn(),
}));

vi.mock("bullmq", () => ({
  Worker: vi.fn().mockImplementation(() => ({
    close: (...args: unknown[]) => mockWorkerClose(...args),
    client: Promise.resolve({
      incr: vi.fn(),
      expire: vi.fn(),
    }),
    on: vi.fn(),
  })),
}));

import { processWhatsAppMessage } from "../../../../scripts/worker.ts";

describe("worker e2e cycle", () => {
  let mockRedisClient: { incr: ReturnType<typeof vi.fn>; expire: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisClient = {
      incr: vi.fn(),
      expire: vi.fn(),
    };
    mockOrchestratorProcessIntent.mockResolvedValue({
      text: "Here are some tailored options.",
      toolResults: [],
      fromCache: false,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            messaging_product: "whatsapp",
            contacts: [{ input: "+15551234567", wa_id: "15551234567" }],
            messages: [{ id: "wamid.e2e123" }],
          }),
          { status: 200 },
        ),
      ),
    );

    process.env.WHATSAPP_PHONE_NUMBER_ID = "123456789";
    process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("processes a message through the full pipeline end-to-end", async () => {
    mockRedisClient.incr.mockResolvedValue(1);
    mockRedisClient.expire.mockResolvedValue(1);

    const result = await processWhatsAppMessage(
      { id: "e2e-test-id", data: { text: "show me coats", sender: "+15551234567" } },
      mockRedisClient,
    );

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.channel).toBe("whatsapp");
      expect(result.text).toBe("Here are some tailored options.");
      expect(result.messageId).toBe("e2e-test-id");
    }

    expect(mockOrchestratorProcessIntent).toHaveBeenCalledWith({
      text: "show me coats",
      channel: "whatsapp",
      platformUserId: "+15551234567",
    });
  });

  it("returns rate_limited when Redis threshold exceeded", async () => {
    mockRedisClient.incr.mockResolvedValue(6);
    mockRedisClient.expire.mockResolvedValue(1);

    const result = await processWhatsAppMessage(
      { id: "spam-job", data: { text: "hi", sender: "+15559876543" } },
      mockRedisClient,
    );

    expect(result.status).toBe("rate_limited");
    if (result.status === "rate_limited") {
      expect(result.sender).toBe("+15559876543");
    }
    expect(mockOrchestratorProcessIntent).not.toHaveBeenCalled();
  });

  it("throws on unknown channel with structured error", async () => {
    mockRedisClient.incr.mockResolvedValue(1);
    mockRedisClient.expire.mockResolvedValue(1);

    await expect(
      processWhatsAppMessage(
        { id: "bad-channel", data: { text: "hello", sender: "+15551234567", channel: "telegram" } },
        mockRedisClient,
      ),
    ).rejects.toThrow("No platform adapter registered for channel: telegram");
  });

  it("normalizes attachments into the text payload", async () => {
    mockRedisClient.incr.mockResolvedValue(1);
    mockRedisClient.expire.mockResolvedValue(1);

    await processWhatsAppMessage(
      {
        id: "attach-job",
        data: {
          text: "check this out",
          sender: "+15551234567",
          attachments: [{ type: "image", url: "https://example.com/photo.jpg" }],
        },
      },
      mockRedisClient,
    );

    expect(mockOrchestratorProcessIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("Attached Media [Type: image]"),
      }),
    );
  });
});
