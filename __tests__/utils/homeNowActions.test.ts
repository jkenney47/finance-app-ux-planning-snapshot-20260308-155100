import { buildFallbackNowActions } from "@/utils/roadmap/homeNowActions";

describe("home now-action fallbacks", () => {
  it("returns three fallback actions when no modeled actions are available", () => {
    const result = buildFallbackNowActions({
      modeledCount: 0,
      accountsLinkedCount: 0,
      coverageLabel: "Low",
    });

    expect(result).toHaveLength(3);
    expect(result[0]?.id).toBe("fallback-connect-primary-account");
    expect(result[1]?.action).toBe("onboarding");
    expect(result[2]?.action).toBe("roadmap");
  });

  it("switches first fallback to connection-health review when accounts exist", () => {
    const result = buildFallbackNowActions({
      modeledCount: 1,
      accountsLinkedCount: 2,
      coverageLabel: "Medium",
    });

    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe("fallback-refresh-account-health");
    expect(result[0]?.action).toBe("accounts");
  });

  it("returns no fallbacks when three modeled actions exist", () => {
    const result = buildFallbackNowActions({
      modeledCount: 3,
      accountsLinkedCount: 1,
      coverageLabel: "High",
    });

    expect(result).toEqual([]);
  });
});
