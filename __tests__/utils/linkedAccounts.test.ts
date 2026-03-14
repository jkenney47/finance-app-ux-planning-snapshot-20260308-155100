import { resolveHasLinkedAccounts } from "@/utils/linkedAccounts";

describe("resolveHasLinkedAccounts", () => {
  it("ignores mock-linked state when real-data mode is enabled", () => {
    expect(
      resolveHasLinkedAccounts({
        linkedAccountCount: 0,
        hasMockLinkedAccounts: true,
        realDataEnabled: true,
      }),
    ).toBe(false);
  });

  it("uses fetched account summary when real-data mode is enabled", () => {
    expect(
      resolveHasLinkedAccounts({
        linkedAccountCount: 1,
        hasMockLinkedAccounts: false,
        realDataEnabled: true,
      }),
    ).toBe(true);
  });

  it("uses mock store state when mock mode is enabled", () => {
    expect(
      resolveHasLinkedAccounts({
        linkedAccountCount: 1,
        hasMockLinkedAccounts: true,
        realDataEnabled: false,
      }),
    ).toBe(true);
  });

  it("returns false while mock summary has no linked accounts", () => {
    expect(
      resolveHasLinkedAccounts({
        linkedAccountCount: 0,
        hasMockLinkedAccounts: true,
        realDataEnabled: false,
      }),
    ).toBe(false);
  });
});
