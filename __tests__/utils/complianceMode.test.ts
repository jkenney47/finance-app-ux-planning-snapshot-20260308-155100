import {
  getComplianceMode,
  resolveComplianceMode,
} from "@/utils/complianceMode";

describe("compliance mode", () => {
  describe("getComplianceMode", () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      originalEnv = process.env;
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("returns education when EXPO_PUBLIC_COMPLIANCE_MODE is not set", () => {
      process.env = { ...originalEnv };
      delete process.env.EXPO_PUBLIC_COMPLIANCE_MODE;
      expect(getComplianceMode()).toBe("education");
    });

    it("returns advisory when EXPO_PUBLIC_COMPLIANCE_MODE is advisory", () => {
      process.env = {
        ...originalEnv,
        EXPO_PUBLIC_COMPLIANCE_MODE: "advisory",
      };
      expect(getComplianceMode()).toBe("advisory");
    });

    it("returns advisory when EXPO_PUBLIC_COMPLIANCE_MODE casing varies", () => {
      process.env = {
        ...originalEnv,
        EXPO_PUBLIC_COMPLIANCE_MODE: "AdViSoRy",
      };
      expect(getComplianceMode()).toBe("advisory");
    });

    it("returns education when EXPO_PUBLIC_COMPLIANCE_MODE is invalid", () => {
      process.env = {
        ...originalEnv,
        EXPO_PUBLIC_COMPLIANCE_MODE: "invalid_mode",
      };
      expect(getComplianceMode()).toBe("education");
    });
  });

  it("defaults to education for blank and unknown values", () => {
    expect(resolveComplianceMode(undefined)).toBe("education");
    expect(resolveComplianceMode("")).toBe("education");
    expect(resolveComplianceMode("something_else")).toBe("education");
  });

  it("normalizes advisory mode", () => {
    expect(resolveComplianceMode("advisory")).toBe("advisory");
    expect(resolveComplianceMode("AdViSoRy")).toBe("advisory");
  });
});
