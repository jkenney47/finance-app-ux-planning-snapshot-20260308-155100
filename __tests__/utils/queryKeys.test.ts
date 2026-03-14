import {
  getDashboardSummaryQueryKey,
  getGoalsListQueryKey,
  getGoalsQueryKey,
  getInsightsListQueryKey,
  getInsightsQueryKey,
  getPolicyBundleQueryKey,
} from "@/utils/queryKeys";

describe("query keys", () => {
  it("includes mock scenario in dashboard summary key for mock mode", () => {
    expect(
      getDashboardSummaryQueryKey({
        realDataEnabled: false,
        hasMockLinkedAccounts: true,
        scenario: "partial_facts",
      }),
    ).toEqual(["dashboard", "summary", "mock", true, "partial_facts"]);
  });

  it("uses live-data sentinel in dashboard summary key for real mode", () => {
    expect(
      getDashboardSummaryQueryKey({
        realDataEnabled: true,
        hasMockLinkedAccounts: false,
        scenario: "policy_stale_thresholds",
      }),
    ).toEqual(["dashboard", "summary", "real", false, "live-data"]);
  });

  it("includes mock scenario in policy bundle key", () => {
    expect(getPolicyBundleQueryKey("policy_stale_thresholds")).toEqual([
      "fme",
      "policy-bundle",
      "US",
      "federal",
      "policy_stale_thresholds",
    ]);
  });

  it("keys goals query by session user id", () => {
    expect(getGoalsQueryKey("user-123")).toEqual(["goals", "list", "user-123"]);
    expect(getGoalsQueryKey(null)).toEqual(["goals", "list", "anonymous"]);
  });

  it("keys insights query by session user id", () => {
    expect(getInsightsQueryKey("user-456")).toEqual([
      "insights",
      "list",
      "user-456",
    ]);
    expect(getInsightsQueryKey(undefined)).toEqual([
      "insights",
      "list",
      "anonymous",
    ]);
  });

  it("keys goals list by session and mode", () => {
    expect(getGoalsListQueryKey({ userId: "user-123", mode: "mock" })).toEqual([
      "goals",
      "list",
      "user-123",
      "mock",
    ]);
    expect(getGoalsListQueryKey({ userId: null, mode: "live" })).toEqual([
      "goals",
      "list",
      "anonymous",
      "live",
    ]);
  });

  it("keys insights list by session and mode", () => {
    expect(
      getInsightsListQueryKey({ userId: "user-456", mode: "mock" }),
    ).toEqual(["insights", "list", "user-456", "mock"]);
    expect(
      getInsightsListQueryKey({ userId: undefined, mode: "live" }),
    ).toEqual(["insights", "list", "anonymous", "live"]);
  });
});
