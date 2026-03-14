import { isRevenueCatPaywallEnabled } from "../../utils/revenueCat";

describe("revenueCat", () => {
  describe("isRevenueCatPaywallEnabled", () => {
    it("returns false", () => {
      expect(isRevenueCatPaywallEnabled()).toBe(false);
    });
  });
});
