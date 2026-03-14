// Shared Gemini/LLM chat utility for web and mobile
import { backendClient } from "@/utils/services/backendClient";

export interface ChatPrompt {
  prompt: string;
}

export interface ChatResponse {
  markdown: string;
  raw?: unknown;
}

/**
 * Validates a chat prompt for safety (no tickers, no buy/sell verbs, etc.)
 * Returns null if valid, or error message if invalid.
 */
export function validatePrompt(prompt: string): string | null {
  // No stock tickers (e.g., $AAPL), no buy/sell verbs
  const forbidden = [
    /\$[A-Z]{1,5}\b/g, // Ticker symbols
    /\bbuy\b/i,
    /\bsell\b/i,
    /\bshort\b/i,
    /\blong\b/i,
  ];
  for (const rule of forbidden) {
    if (rule.test(prompt)) {
      return "Sorry, prompts cannot reference tickers or buy/sell actions.";
    }
  }
  return null;
}

const CHAT_EXPLAIN_PATH = "/chat-explain";

/**
 * Calls the chat explain backend and falls back to a deterministic mock if unavailable.
 */
export async function callGemini(prompt: string): Promise<ChatResponse> {
  try {
    const data = await backendClient.post<{
      markdown?: string;
      response?: string;
      raw?: unknown;
    }>(CHAT_EXPLAIN_PATH, { prompt });
    return {
      markdown:
        data.markdown ??
        data.response ??
        `I could not format a response for: \`${prompt}\``,
      raw: data.raw ?? data,
    };
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return {
      markdown: `**Mock Gemini Response**\n\nYou asked: \`${prompt}\`\n\n- _Pros:_ ...\n- _Cons:_ ...`,
      raw: null,
    };
  }
}
