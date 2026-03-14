// Supabase Edge Function: sendPush (Node 18 runtime)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createRequestId, jsonError, jsonSuccess } from "../_shared/http.ts";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

async function getUserIdForInsight(insightId: string): Promise<string | null> {
  const { data: insight, error: insightErr } = await supabase
    .from("insights")
    .select("user_id")
    .eq("id", insightId)
    .single();

  if (insightErr || !insight) {
    return null;
  }
  return insight.user_id;
}

async function getPushTokenForUser(userId: string): Promise<string | null> {
  const { data: tokenRow } = await supabase
    .from("user_push_tokens")
    .select("expo_push_token")
    .eq("user_id", userId)
    .order("last_seen_at", { ascending: false })
    .limit(1)
    .single();

  return tokenRow ? tokenRow.expo_push_token : null;
}

async function sendExpoPush(token: string, insightId: string): Promise<void> {
  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: token,
      title: "New Insight",
      body: "Open the app to view the latest recommendation.",
      data: { insight_id: insightId },
    }),
  });
}

serve(async (req) => {
  const requestId = createRequestId();
  let insightId: string | null = null;
  try {
    const payload = (await req.json()) as { insight_id?: unknown };
    insightId =
      typeof payload.insight_id === "string" ? payload.insight_id : null;
  } catch {
    return jsonError({
      status: 400,
      error: "Invalid JSON payload",
      code: "invalid_json_payload",
      requestId,
    });
  }

  if (!insightId) {
    return jsonError({
      status: 400,
      error: "insight_id is required",
      code: "missing_insight_id",
      requestId,
    });
  }

  // 1. Look up the user who owns the insight
  const userId = await getUserIdForInsight(insightId);
  if (!userId) {
    return jsonError({
      status: 400,
      error: "insight lookup failed",
      code: "insight_lookup_failed",
      requestId,
    });
  }

  // 2. Get the most recent push token for that user
  const expoPushToken = await getPushTokenForUser(userId);
  if (!expoPushToken) {
    return jsonSuccess(
      { status: "no_token" },
      { status: 200, requestId, includeRequestIdInBody: true },
    );
  }

  // 3. Send push via Expo
  await sendExpoPush(expoPushToken, insightId);

  return jsonSuccess(
    { status: "queued" },
    { status: 200, requestId, includeRequestIdInBody: true },
  );
});
