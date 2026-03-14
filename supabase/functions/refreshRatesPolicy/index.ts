// Supabase Edge Function: refreshRatesPolicy (Node 18 runtime)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createRequestId, jsonError, jsonSuccess } from "../_shared/http.ts";
import { parseLatestFredValue, toDecimalPercent } from "../_shared/fred.ts";
import { authorizePolicyAdminAccess } from "../_shared/policyAdminAuth.ts";

type RatesPolicyPack = {
  riskFreeRateApy: number;
  debtRiskPremiumApr: number;
  toxicAprFloor: number;
  greyZoneAprFloor: number;
};

type RefreshRequest = {
  region?: string;
  jurisdiction?: string;
  effectiveFrom?: string;
  riskFreeRateApy?: number;
  debtRiskPremiumApr?: number;
  toxicAprFloor?: number;
  greyZoneAprFloor?: number;
  dryRun?: boolean;
  publishMode?: "draft" | "approved";
};

type PolicyPackRow = {
  version: number;
  pack: RatesPolicyPack | null;
};

type PolicyVersionRow = {
  version: number;
};

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const REFRESH_SECRET = process.env.POLICY_REFRESH_SECRET;
const DEFAULT_REGION = "US";
const DEFAULT_JURISDICTION = "federal";
const DEFAULT_DEBT_RISK_PREMIUM_APR = 0.03;
const DEFAULT_TOXIC_APR_FLOOR = 0.08;
const DEFAULT_GREY_ZONE_APR_FLOOR = 0.05;
const FRED_DFF_CSV_URL =
  "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DFF";
const NUMBER_EPSILON = 1e-6;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function badRequestResponse(error: string, requestId: string): Response {
  return jsonError({
    status: 400,
    error,
    code: "invalid_request",
    requestId,
  });
}

function clampRate(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function sameRatesPack(left: RatesPolicyPack, right: RatesPolicyPack): boolean {
  return (
    Math.abs(left.riskFreeRateApy - right.riskFreeRateApy) < NUMBER_EPSILON &&
    Math.abs(left.debtRiskPremiumApr - right.debtRiskPremiumApr) <
      NUMBER_EPSILON &&
    Math.abs(left.toxicAprFloor - right.toxicAprFloor) < NUMBER_EPSILON &&
    Math.abs(left.greyZoneAprFloor - right.greyZoneAprFloor) < NUMBER_EPSILON
  );
}

async function fetchRiskFreeRateApy(): Promise<number> {
  const response = await fetch(FRED_DFF_CSV_URL);
  if (!response.ok) {
    throw new Error(`FRED request failed (${response.status})`);
  }
  const csv = await response.text();
  const latestPercent = parseLatestFredValue(csv);
  if (latestPercent === null) {
    throw new Error("Unable to parse latest FRED DFF value");
  }
  return clampRate(toDecimalPercent(latestPercent));
}

function buildRatesPack(
  request: RefreshRequest,
  riskFreeRateApy: number,
): RatesPolicyPack {
  const debtRiskPremiumApr = clampRate(
    request.debtRiskPremiumApr ?? DEFAULT_DEBT_RISK_PREMIUM_APR,
  );
  const toxicAprFloor = clampRate(
    request.toxicAprFloor ??
      Math.max(DEFAULT_TOXIC_APR_FLOOR, riskFreeRateApy + debtRiskPremiumApr),
  );
  const greyZoneAprFloor = clampRate(
    request.greyZoneAprFloor ??
      Math.max(
        DEFAULT_GREY_ZONE_APR_FLOOR,
        riskFreeRateApy + debtRiskPremiumApr * 0.4,
      ),
  );
  return {
    riskFreeRateApy,
    debtRiskPremiumApr,
    toxicAprFloor,
    greyZoneAprFloor,
  };
}

async function fetchLatestApprovedRow(region: string, jurisdiction: string) {
  return supabase
    .from("policy_packs")
    .select("version,pack")
    .eq("domain", "rates")
    .eq("region", region)
    .eq("jurisdiction", jurisdiction)
    .eq("status", "approved")
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();
}

async function fetchLatestVersionRow(region: string, jurisdiction: string) {
  return supabase
    .from("policy_packs")
    .select("version")
    .eq("domain", "rates")
    .eq("region", region)
    .eq("jurisdiction", jurisdiction)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
}

type RatesPolicyPackInsertPayload = {
  domain: "rates";
  region: string;
  jurisdiction: string;
  version: number;
  pack: ReturnType<typeof buildRatesPack>;
  effective_from: string;
  effective_to: null;
  status: "approved" | "draft";
  source: "system" | "refreshRatesPolicy";
  approved_at: string | null;
};

async function insertRatesPackRow(insertPayload: RatesPolicyPackInsertPayload) {
  return supabase.from("policy_packs").insert([insertPayload]);
}

export async function handleRefreshRequest(req: Request) {
  const requestId = createRequestId();

  if (req.method !== "POST") {
    return jsonError({
      status: 405,
      error: "Method Not Allowed",
      code: "method_not_allowed",
      requestId,
    });
  }

  const authResult = await authorizePolicyAdminAccess(req, supabase, {
    sharedSecret: REFRESH_SECRET,
  });
  if ("response" in authResult) {
    return authResult.response;
  }

  let payload: RefreshRequest = {};
  try {
    payload = (await req.json()) as RefreshRequest;
  } catch {
    payload = {};
  }

  const region = payload.region ?? DEFAULT_REGION;
  const jurisdiction = payload.jurisdiction ?? DEFAULT_JURISDICTION;
  const nowIso = new Date().toISOString();
  const effectiveFrom = payload.effectiveFrom ?? nowIso;
  const effectiveFromDate = new Date(effectiveFrom);
  if (Number.isNaN(effectiveFromDate.getTime())) {
    return badRequestResponse("Invalid effectiveFrom timestamp", requestId);
  }

  const riskFreeRateApy = clampRate(
    payload.riskFreeRateApy ?? (await fetchRiskFreeRateApy()),
  );
  const ratesPack = buildRatesPack(payload, riskFreeRateApy);
  const publishMode = payload.publishMode === "draft" ? "draft" : "approved";
  const approvedAt = publishMode === "approved" ? nowIso : null;

  const { data: latestApprovedRowData, error: latestApprovedRowError } =
    await fetchLatestApprovedRow(region, jurisdiction);

  if (latestApprovedRowError) {
    return jsonError({
      status: 500,
      error: "Failed to fetch latest rates pack",
      code: "latest_rates_pack_fetch_failed",
      details: "internal_error",
      requestId,
    });
  }

  const { data: latestVersionRowData, error: latestVersionRowError } =
    await fetchLatestVersionRow(region, jurisdiction);

  if (latestVersionRowError) {
    return jsonError({
      status: 500,
      error: "Failed to fetch latest rates version",
      code: "latest_rates_version_fetch_failed",
      details: "internal_error",
      requestId,
    });
  }

  const latestApprovedRow =
    (latestApprovedRowData as PolicyPackRow | null) ?? null;
  const latestVersionRow =
    (latestVersionRowData as PolicyVersionRow | null) ?? null;
  const previousPack = latestApprovedRow?.pack ?? null;

  if (previousPack && sameRatesPack(previousPack, ratesPack)) {
    return jsonSuccess(
      {
        status: "no_change",
        region,
        jurisdiction,
        rates: ratesPack,
      },
      { status: 200, requestId, includeRequestIdInBody: true },
    );
  }

  const nextVersion = (latestVersionRow?.version ?? 0) + 1;
  if (payload.dryRun) {
    return jsonSuccess(
      {
        status: "dry_run",
        region,
        jurisdiction,
        version: nextVersion,
        effectiveFrom: effectiveFromDate.toISOString(),
        publishMode,
        rates: ratesPack,
      },
      { status: 200, requestId, includeRequestIdInBody: true },
    );
  }

  const insertPayload: RatesPolicyPackInsertPayload = {
    domain: "rates",
    region,
    jurisdiction,
    version: nextVersion,
    effective_from: effectiveFromDate.toISOString(),
    effective_to: null,
    pack: ratesPack,
    source: "refreshRatesPolicy",
    status: publishMode,
    approved_at: approvedAt,
  };

  const { error: insertError } = await insertRatesPackRow(insertPayload);

  if (insertError) {
    return jsonError({
      status: 500,
      error: "Failed to insert rates pack",
      code: "rates_pack_insert_failed",
      details: "internal_error",
      requestId,
    });
  }

  return jsonSuccess(
    {
      status: publishMode === "approved" ? "updated" : "staged",
      region,
      jurisdiction,
      version: nextVersion,
      publishMode,
      effectiveFrom: insertPayload.effective_from,
      rates: ratesPack,
    },
    { status: 200, requestId, includeRequestIdInBody: true },
  );
}

serve(handleRefreshRequest);
