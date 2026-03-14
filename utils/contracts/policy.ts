export type PolicyDomain = "rates" | "thresholds" | "limits" | "tax_labels";

export const POLICY_DOMAINS: PolicyDomain[] = [
  "rates",
  "thresholds",
  "limits",
  "tax_labels",
];

export type PolicyPackStatus = "draft" | "approved";

export type RatesPolicy = {
  riskFreeRateApy: number;
  debtRiskPremiumApr: number;
  toxicAprFloor: number;
  greyZoneAprFloor: number;
};

export type ThresholdsPolicy = {
  starterFundFloor: number;
  fortressFundMonths: {
    stableSingle: number;
    stableDual: number;
    variableSingle: number;
    variableDual: number;
  };
};

export type LimitsPolicy = {
  retirementContributionTargetPercent: number;
};

export type TaxLabelsPolicy = {
  regimeLabel: string;
};

export type PolicyDataByDomain = {
  rates: RatesPolicy;
  thresholds: ThresholdsPolicy;
  limits: LimitsPolicy;
  tax_labels: TaxLabelsPolicy;
};

export type PolicyPack<K extends PolicyDomain = PolicyDomain> = {
  domain: K;
  region: string;
  jurisdiction: string;
  version: number;
  effectiveFrom: string;
  effectiveTo?: string;
  publishedAt: string;
  source: string;
  status: PolicyPackStatus;
  data: PolicyDataByDomain[K];
};

export type PolicyBundle = {
  asOf: string;
  domains: Partial<{
    [K in PolicyDomain]: PolicyPack<K>;
  }>;
};

export type PolicyStatus = {
  domain: PolicyDomain;
  isStale: boolean;
  ageDays: number | null;
  maxAgeDays: number;
  reason?: string;
};
