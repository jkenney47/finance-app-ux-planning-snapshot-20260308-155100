// Supabase Edge Function: refreshThresholdsPolicy (Node 18 runtime)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createRequestId, jsonError, jsonSuccess } from "../_shared/http.ts";
import {
  computeYearOverYearInflation,
  parseFredSeries,
} from "../_shared/fred.ts";
import { authorizePolicyAdminAccess } from "../_shared/policyAdminAuth.ts";

type FortressFundMonths = {
  stableSingle: number;
  stableDual: number;
  variableSingle: number;
  variableDual: number;
};

type ThresholdsPolicyPack = {
  starterFundFloor: number;
  fortressFundMonths: FortressFundMonths;
};

type RefreshRequest = {
  region?: string;
  jurisdiction?: string;
  effectiveFrom?: string;
  starterFundFloor?: number;
  fortressFundMonths?: Partial<FortressFundMonths>;
  yoyInflationOverride?: number;
  dryRun?: boolean;
  publishMode?: "draft" | "approved";
};

type PolicyPackRow = {
  version: number;
  pack: ThresholdsPolicyPack | null;
};

type PolicyVersionRow = {
  version: number;
};

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const REFRESH_SECRET = process.env.POLICY_REFRESH_SECRET;
const DEFAULT_REGION = "US";
const DEFAULT_JURISDICTION = "federal";
const FRED_CPI_CSV_URL =
  "https://fred.stlouisfed.org/graph/fredgraph.csv?id=CPIAUCSL";

const BASE_STARTER_FUND_FLOOR = 2500;
const MIN_STARTER_FUND_FLOOR = 1000;
const MAX_STARTER_FUND_FLOOR = 20000;
const ROUND_INCREMENT = 50;
const DEFAULT_FORTRESS_MONTHS: FortressFundMonths = {
  stableSingle: 6,
  stableDual: 3,
  variableSingle: 9,
  variableDual: 6,
};
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

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function roundToIncrement(value: number, increment: number): number {
  if (!Number.isFinite(value)) return BASE_STARTER_FUND_FLOOR;
  return Math.round(value / increment) * increment;
}

function clampMonth(value: number): number {
  return Math.round(clamp(value, 1, 24));
}

function normalizeFortressMonths(
  partial?: Partial<FortressFundMonths>,
): FortressFundMonths {
  return {
    stableSingle: clampMonth(
      partial?.stableSingle ?? DEFAULT_FORTRESS_MONTHS.stableSingle,
    ),
    stableDual: clampMonth(
      partial?.stableDual ?? DEFAULT_FORTRESS_MONTHS.stableDual,
    ),
    variableSingle: clampMonth(
      partial?.variableSingle ?? DEFAULT_FORTRESS_MONTHS.variableSingle,
    ),
    variableDual: clampMonth(
      partial?.variableDual ?? DEFAULT_FORTRESS_MONTHS.variableDual,
    ),
  };
}

function sameThresholdPack(
  left: ThresholdsPolicyPack,
  right: ThresholdsPolicyPack,
): boolean {
  return (
    Math.abs(left.starterFundFloor - right.starterFundFloor) < NUMBER_EPSILON &&
    left.fortressFundMonths.stableSingle ===
      right.fortressFundMonths.stableSingle &&
    left.fortressFundMonths.stableDual ===
      right.fortressFundMonths.stableDual &&
    left.fortressFundMonths.variableSingle ===
      right.fortressFundMonths.variableSingle &&
    left.fortressFundMonths.variableDual ===
      right.fortressFundMonths.variableDual
  );
}

async function fetchYearOverYearInflation(): Promise<number> {
  const response = await fetch(FRED_CPI_CSV_URL);
  if (!response.ok) {
    throw new Error(`FRED request failed (${response.status})`);
  }
  const csv = await response.text();
  const series = parseFredSeries(csv);
  const yoyInflation = computeYearOverYearInflation(series);
  if (yoyInflation === null) {
    throw new Error("Unable to compute year-over-year inflation from CPI data");
  }
  return clamp(yoyInflation, -0.2, 0.2);
}

function buildThresholdPack(
  request: RefreshRequest,
  yoyInflation: number,
): ThresholdsPolicyPack {
  const computedStarter = roundToIncrement(
    BASE_STARTER_FUND_FLOOR * (1 + yoyInflation),
    ROUND_INCREMENT,
  );
  const starterFundFloor = Math.round(
    clamp(
      request.starterFundFloor ?? computedStarter,
      MIN_STARTER_FUND_FLOOR,
      MAX_STARTER_FUND_FLOOR,
    ),
  );
  const fortressFundMonths = normalizeFortressMonths(
    request.fortressFundMonths,
  );
  return {
    starterFundFloor,
    fortressFundMonths,
  };
}

serve(async (req) => {
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

  const yoyInflation = clamp(
    payload.yoyInflationOverride ?? (await fetchYearOverYearInflation()),
    -0.2,
    0.2,
  );
  const thresholdPack = buildThresholdPack(payload, yoyInflation);
  const publishMode = payload.publishMode === "draft" ? "draft" : "approved";
  const approvedAt = publishMode === "approved" ? nowIso : null;

  const { data: latestApprovedRowData, error: latestApprovedRowError } =
    await supabase
      .from("policy_packs")
      .select("version,pack")
      .eq("domain", "thresholds")
      .eq("region", region)
      .eq("jurisdiction", jurisdiction)
      .eq("status", "approved")
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (latestApprovedRowError) {
    return jsonError({
      status: 500,
      error: "Failed to fetch latest thresholds pack",
      code: "latest_thresholds_pack_fetch_failed",
      details: "internal_error",
      requestId,
    });
  }

  const { data: latestVersionRowData, error: latestVersionRowError } =
    await supabase
      .from("policy_packs")
      .select("version")
      .eq("domain", "thresholds")
      .eq("region", region)
      .eq("jurisdiction", jurisdiction)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (latestVersionRowError) {
    return jsonError({
      status: 500,
      error: "Failed to fetch latest thresholds version",
      code: "latest_thresholds_version_fetch_failed",
      details: "internal_error",
      requestId,
    });
  }

  const latestApprovedRow =
    (latestApprovedRowData as PolicyPackRow | null) ?? null;
  const latestVersionRow =
    (latestVersionRowData as PolicyVersionRow | null) ?? null;
  const previousPack = latestApprovedRow?.pack ?? null;
  if (previousPack && sameThresholdPack(previousPack, thresholdPack)) {
    return jsonSuccess(
      {
        status: "no_change",
        region,
        jurisdiction,
        thresholds: thresholdPack,
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
        thresholds: thresholdPack,
        inputs: {
          yoyInflation,
        },
      },
      { status: 200, requestId, includeRequestIdInBody: true },
    );
  }

  const insertPayload = {
    domain: "thresholds",
    region,
    jurisdiction,
    version: nextVersion,
    effective_from: effectiveFromDate.toISOString(),
    pack: thresholdPack,
    source: "refreshThresholdsPolicy",
    status: publishMode,
    approved_at: approvedAt,
  };

  const { error: insertError } = await supabase
    .from("policy_packs")
    .insert([insertPayload]);

  if (insertError) {
    return jsonError({
      status: 500,
      error: "Failed to insert thresholds pack",
      code: "thresholds_pack_insert_failed",
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
      effectiveFrom: effectiveFromDate.toISOString(),
      thresholds: thresholdPack,
      inputs: {
        yoyInflation,
      },
    },
    { status: 200, requestId, includeRequestIdInBody: true },
  );
});
