jest.mock("@/utils/supabaseClient", () => ({
  supabase: {},
}));

import {
  toPolicyPack,
  type PolicyPackRow,
} from "@/utils/queries/usePolicyBundle";
import { toRulePack, type RulePackRow } from "@/utils/queries/useRulePack";

describe("policy and rule mapper fallbacks", () => {
  it("maps policy pack publishedAt from approved_at", () => {
    const row: PolicyPackRow = {
      domain: "rates",
      region: "US",
      jurisdiction: "federal",
      version: 2,
      effective_from: "2026-02-01T00:00:00.000Z",
      effective_to: null,
      approved_at: "2026-02-02T00:00:00.000Z",
      updated_at: "2026-02-03T00:00:00.000Z",
      source: "test",
      status: "approved",
      pack: {
        riskFreeRateApy: 0.04,
        debtRiskPremiumApr: 0.03,
        toxicAprFloor: 0.08,
        greyZoneAprFloor: 0.05,
      },
    };

    const mapped = toPolicyPack(row);
    expect(mapped).not.toBeNull();
    expect(mapped?.publishedAt).toBe("2026-02-02T00:00:00.000Z");
  });

  it("falls back to updated_at when approved_at is null", () => {
    const row: PolicyPackRow = {
      domain: "limits",
      region: "US",
      jurisdiction: "federal",
      version: 1,
      effective_from: "2026-01-01T00:00:00.000Z",
      effective_to: null,
      approved_at: null,
      updated_at: "2026-01-05T00:00:00.000Z",
      source: null,
      status: "approved",
      pack: {
        retirementContributionTargetPercent: 0.15,
      },
    };

    const mapped = toPolicyPack(row);
    expect(mapped).not.toBeNull();
    expect(mapped?.publishedAt).toBe("2026-01-05T00:00:00.000Z");
  });

  it("maps rule pack publishedAt from approved_at fallback", () => {
    const withApprovedAt: RulePackRow = {
      version: 5,
      region: "US",
      effective_from: "2026-02-01T00:00:00.000Z",
      approved_at: "2026-02-10T00:00:00.000Z",
      updated_at: "2026-02-11T00:00:00.000Z",
      pack: {
        templates: [],
        milestones: [],
      },
    };

    const withoutApprovedAt: RulePackRow = {
      ...withApprovedAt,
      approved_at: null,
    };

    expect(toRulePack(withApprovedAt).publishedAt).toBe(
      "2026-02-10T00:00:00.000Z",
    );
    expect(toRulePack(withoutApprovedAt).publishedAt).toBe(
      "2026-02-11T00:00:00.000Z",
    );
  });
});
