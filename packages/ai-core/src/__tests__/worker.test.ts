import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockOrchestratorProcessIntent = vi.fn();
const mockOrchestratorClose = vi.fn();
const mockSdkShutdown = vi.fn();
const mockWorkerClose = vi.fn();
const mockConsoleWarn = vi.fn();

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

import { processWhatsAppMessage, platformRegistry, orchestratorService, shutdown } from "../../../../scripts/worker.ts";

describe("processWhatsAppMessage", () => {
  let mockRedisClient: { incr: ReturnType<typeof vi.fn>; expire: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisClient = {
      incr: vi.fn(),
      expire: vi.fn(),
    };
    mockOrchestratorProcessIntent.mockResolvedValue({
      text: "Here are a few tailored options.",
      toolResults: [],
      fromCache: false,
    });

    // Mock WhatsAppAdapter.sendResponse
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            messaging_product: "whatsapp",
            contacts: [{ input: "+15551234567", wa_id: "15551234567" }],
            messages: [{ id: "wamid.test123" }],
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

  // Test case 1: Rate limiting blocks spam
  it("blocks spam when rate limit exceeds 5 requests per window", async () => {
    mockRedisClient.incr.mockResolvedValue(6);
    mockRedisClient.expire.mockResolvedValue(1);

    const result = await processWhatsAppMessage(
      { id: "job-1", data: { text: "hello", sender: "+15551234567" } },
      mockRedisClient,
    );

    expect(result.status).toBe("rate_limited");
    expect(mockRedisClient.incr).toHaveBeenCalledWith("rate:+15551234567");
    expect(mockOrchestratorProcessIntent).not.toHaveBeenCalled();
  });

  // Test case 2: Rate limiting allows normal messages
  it("processes message when rate limit allows", async () => {
    mockRedisClient.incr.mockResolvedValue(1);
    mockRedisClient.expire.mockResolvedValue(1);

    const result = await processWhatsAppMessage(
      { id: "job-2", data: { text: "show me coats", sender: "+15551234567" } },
      mockRedisClient,
    );

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.messageId).toBe("job-2");
    }
    expect(mockOrchestratorProcessIntent).toHaveBeenCalledWith({
      text: "show me coats",
      channel: "whatsapp",
      platformUserId: "+15551234567",
    });
  });

  // Test case 3: Attachment normalization
  it("normalizes attachments into the text payload", async () => {
    mockRedisClient.incr.mockResolvedValue(1);
    mockRedisClient.expire.mockResolvedValue(1);

    await processWhatsAppMessage(
      {
        id: "job-3",
        data: {
          text: "check this",
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

  // Test case 4: No adapter for unknown channel
  it("throws when no adapter is registered for the channel", async () => {
    mockRedisClient.incr.mockResolvedValue(1);
    mockRedisClient.expire.mockResolvedValue(1);

    await expect(
      processWhatsAppMessage(
        { id: "job-4", data: { text: "hello", sender: "+15551234567", channel: "telegram" } },
        mockRedisClient,
      ),
    ).rejects.toThrow("No platform adapter registered for channel: telegram");
  });

  // Test case 5: Zod validation rejects malformed job data
  it("rejects job data missing required sender field", async () => {
    mockRedisClient.incr.mockResolvedValue(1);
    mockRedisClient.expire.mockResolvedValue(1);

    await expect(
      processWhatsAppMessage(
        { id: "job-5", data: { text: "hello" } },
        mockRedisClient,
      ),
    ).rejects.toThrow();
  });
});
