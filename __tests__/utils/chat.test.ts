jest.mock("@/utils/services/backendClient", () => ({
  backendClient: {
    post: jest.fn(),
  },
}));

import { callGemini, validatePrompt } from "@/utils/chat";
import { backendClient } from "@/utils/services/backendClient";

const mockedBackendClient = backendClient as jest.Mocked<typeof backendClient>;

describe("chat utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects prompts that mention tickers or trading actions", () => {
    expect(validatePrompt("Should I buy $AAPL today?")).toBe(
      "Sorry, prompts cannot reference tickers or buy/sell actions.",
    );
    expect(validatePrompt("Can I sell this now?")).toBe(
      "Sorry, prompts cannot reference tickers or buy/sell actions.",
    );
    expect(validatePrompt("Help me plan my emergency fund.")).toBeNull();
  });

  it("returns markdown from backend payload", async () => {
    mockedBackendClient.post.mockResolvedValue({
      markdown: "### Hello",
      raw: { mode: "deterministic" },
    });

    await expect(callGemini("Explain my plan")).resolves.toEqual({
      markdown: "### Hello",
      raw: { mode: "deterministic" },
    });
    expect(mockedBackendClient.post).toHaveBeenCalledWith("/chat-explain", {
      prompt: "Explain my plan",
    });
  });

  it("falls back to response field when markdown is missing", async () => {
    mockedBackendClient.post.mockResolvedValue({
      response: "Fallback response",
      raw: { provider: "demo" },
    });

    await expect(callGemini("Summarize this")).resolves.toEqual({
      markdown: "Fallback response",
      raw: { provider: "demo" },
    });
  });

  it("returns deterministic local mock when backend request fails", async () => {
    mockedBackendClient.post.mockRejectedValue(new Error("network failure"));

    const result = await callGemini("Explain my cash flow");

    expect(result.markdown).toContain("Mock Gemini Response");
    expect(result.markdown).toContain("Explain my cash flow");
    expect(result.raw).toBeNull();
  });
});
