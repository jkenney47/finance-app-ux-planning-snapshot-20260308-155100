import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  createRequestId,
  jsonError,
  jsonSuccess,
  optionsResponse,
} from "../_shared/http.ts";
import { authenticateChatExplainRequest } from "./auth.ts";

type ChatExplainRequest = {
  prompt?: unknown;
};

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const FORBIDDEN_PROMPT_RULES: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /\$[A-Z]{1,5}\b/,
    message: "Prompts cannot reference ticker symbols.",
  },
  {
    pattern: /\bbuy\b/i,
    message: "Prompts cannot ask for buy actions.",
  },
  {
    pattern: /\bsell\b/i,
    message: "Prompts cannot ask for sell actions.",
  },
  {
    pattern: /\bshort\b/i,
    message: "Prompts cannot ask for short actions.",
  },
  {
    pattern: /\blong\b/i,
    message: "Prompts cannot ask for long actions.",
  },
];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function unauthorized(error: string, requestId: string): Response {
  return jsonError({
    status: 401,
    error,
    code: "unauthorized",
    cors: true,
    requestId,
  });
}

function badRequest(
  error: string,
  requestId: string,
  details?: unknown,
): Response {
  return jsonError({
    status: 400,
    error,
    code: "invalid_request",
    details,
    cors: true,
    requestId,
  });
}

function promptNotAllowed(
  error: string,
  requestId: string,
  details?: unknown,
): Response {
  return jsonError({
    status: 422,
    error,
    code: "prompt_not_allowed",
    details,
    cors: true,
    requestId,
  });
}

function internalError(
  error: string,
  requestId: string,
  details?: unknown,
): Response {
  return jsonError({
    status: 500,
    error,
    code: "internal_error",
    details,
    cors: true,
    requestId,
  });
}

async function resolveUserIdFromAccessToken(
  accessToken: string,
): Promise<string | null> {
  const { data: authData, error: authError } =
    await supabase.auth.getUser(accessToken);
  if (authError || !authData.user?.id) {
    return null;
  }
  return authData.user.id;
}

function normalizePrompt(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 ? normalized : null;
}

function validatePrompt(prompt: string): string | null {
  for (const rule of FORBIDDEN_PROMPT_RULES) {
    if (rule.pattern.test(prompt)) {
      return rule.message;
    }
  }
  return null;
}

function formatPromptForDisplay(prompt: string): string {
  const maxLength = 500;
  if (prompt.length <= maxLength) return prompt;
  return `${prompt.slice(0, maxLength)}...`;
}

function buildDeterministicResponse(prompt: string): string {
  const displayPrompt = formatPromptForDisplay(prompt);
  return [
    "### Plain-English Explanation",
    "",
    `You asked: "${displayPrompt}"`,
    "",
    "1. What this means",
    "Focus on cash flow stability first: income reliability, required expenses, and debt obligations.",
    "",
    "2. Why this matters",
    "A stable monthly baseline reduces the risk of short-term setbacks derailing longer-term goals.",
    "",
    "3. Next practical step",
    "Pick one specific action you can complete in the next 7 days and measure the result.",
    "",
    "4. Assumptions to verify",
    "- Your balances and monthly cash-flow figures are current.",
    "- You are prioritizing financial resilience over speculative returns.",
    "",
    "_Education only. Not investment advice._",
  ].join("\n");
}

serve(async (req) => {
  const requestId = createRequestId();

  if (req.method === "OPTIONS") {
    return optionsResponse();
  }

  if (req.method !== "POST") {
    return jsonError({
      status: 405,
      error: "Method Not Allowed",
      code: "method_not_allowed",
      cors: true,
      requestId,
    });
  }

  const authResult = await authenticateChatExplainRequest(
    req.headers.get("authorization"),
    resolveUserIdFromAccessToken,
  );
  if (!authResult.ok && authResult.reason === "missing_bearer") {
    return unauthorized("Missing bearer token", requestId);
  }
  if (!authResult.ok && authResult.reason === "invalid_bearer") {
    return unauthorized("Unable to verify authenticated user", requestId);
  }

  let payload: ChatExplainRequest;
  try {
    payload = (await req.json()) as ChatExplainRequest;
  } catch {
    return badRequest("Invalid JSON payload", requestId);
  }

  const prompt = normalizePrompt(payload.prompt);
  if (!prompt) {
    return badRequest("Prompt is required", requestId, {
      field: "prompt",
    });
  }

  if (prompt.length > 2000) {
    return badRequest("Prompt must be 2000 characters or less", requestId, {
      field: "prompt",
      maxLength: 2000,
    });
  }

  const promptValidationError = validatePrompt(prompt);
  if (promptValidationError) {
    return promptNotAllowed(promptValidationError, requestId, {
      field: "prompt",
    });
  }

  try {
    const markdown = buildDeterministicResponse(prompt);

    return jsonSuccess(
      {
        markdown,
        response: markdown,
        raw: {
          mode: "deterministic",
          promptLength: prompt.length,
        },
      },
      {
        status: 200,
        requestId,
        cors: true,
        includeRequestIdInBody: true,
      },
    );
  } catch (error) {
    console.error("Chat explain error:", error);
    return internalError(
      "Unable to produce response",
      requestId,
      "internal_error",
    );
  }
});
