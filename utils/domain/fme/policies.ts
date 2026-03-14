import type {
  PolicyBundle,
  PolicyDomain,
  PolicyPack,
  PolicyStatus,
} from "@/utils/contracts/policy";
import { POLICY_DOMAINS } from "@/utils/contracts/policy";

const DEFAULT_REGION = "US";
const DEFAULT_JURISDICTION = "federal";
const DEFAULT_STATUS = "approved";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const POLICY_MAX_AGE_DAYS: Record<PolicyDomain, number> = {
  rates: 14,
  thresholds: 120,
  limits: 400,
  tax_labels: 400,
};

function safeDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function ageInDays(
  publishedAt: string | undefined,
  nowIso: string,
): number | null {
  const publishedDate = safeDate(publishedAt);
  const nowDate = safeDate(nowIso);
  if (!publishedDate || !nowDate) return null;
  return Math.max(
    0,
    Math.floor((nowDate.getTime() - publishedDate.getTime()) / MS_PER_DAY),
  );
}

export function buildDefaultPolicyBundle(
  nowIso = new Date().toISOString(),
): PolicyBundle {
  const rates: PolicyPack<"rates"> = {
    domain: "rates",
    region: DEFAULT_REGION,
    jurisdiction: DEFAULT_JURISDICTION,
    version: 1,
    effectiveFrom: nowIso,
    publishedAt: nowIso,
    source: "local-default",
    status: DEFAULT_STATUS,
    data: {
      riskFreeRateApy: 0.042,
      debtRiskPremiumApr: 0.03,
      toxicAprFloor: 0.08,
      greyZoneAprFloor: 0.05,
    },
  };

  const thresholds: PolicyPack<"thresholds"> = {
    domain: "thresholds",
    region: DEFAULT_REGION,
    jurisdiction: DEFAULT_JURISDICTION,
    version: 1,
    effectiveFrom: nowIso,
    publishedAt: nowIso,
    source: "local-default",
    status: DEFAULT_STATUS,
    data: {
      starterFundFloor: 2500,
      fortressFundMonths: {
        stableSingle: 6,
        stableDual: 3,
        variableSingle: 9,
        variableDual: 6,
      },
    },
  };

  const limits: PolicyPack<"limits"> = {
    domain: "limits",
    region: DEFAULT_REGION,
    jurisdiction: DEFAULT_JURISDICTION,
    version: 1,
    effectiveFrom: nowIso,
    publishedAt: nowIso,
    source: "local-default",
    status: DEFAULT_STATUS,
    data: {
      retirementContributionTargetPercent: 0.15,
    },
  };

  const taxLabels: PolicyPack<"tax_labels"> = {
    domain: "tax_labels",
    region: DEFAULT_REGION,
    jurisdiction: DEFAULT_JURISDICTION,
    version: 1,
    effectiveFrom: nowIso,
    publishedAt: nowIso,
    source: "local-default",
    status: DEFAULT_STATUS,
    data: {
      regimeLabel: "US baseline policy pack",
    },
  };

  return {
    asOf: nowIso,
    domains: {
      rates,
      thresholds,
      limits,
      tax_labels: taxLabels,
    },
  };
}

export function getPolicyStatuses(
  policyBundle: PolicyBundle,
  nowIso = new Date().toISOString(),
): PolicyStatus[] {
  return POLICY_DOMAINS.map((domain) => {
    const pack = policyBundle.domains[domain];
    const maxAgeDays = POLICY_MAX_AGE_DAYS[domain];

    if (!pack) {
      return {
        domain,
        isStale: true,
        ageDays: null,
        maxAgeDays,
        reason: "missing_pack",
      };
    }

    const ageDays = ageInDays(pack.publishedAt, nowIso);
    if (ageDays === null) {
      return {
        domain,
        isStale: true,
        ageDays,
        maxAgeDays,
        reason: "invalid_timestamp",
      };
    }

    return {
      domain,
      isStale: ageDays > maxAgeDays,
      ageDays,
      maxAgeDays,
      reason: ageDays > maxAgeDays ? "stale_pack" : undefined,
    };
  });
}
