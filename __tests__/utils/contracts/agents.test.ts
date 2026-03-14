import {
  isAgentCapability,
  isAgentProviderProtocol,
} from "@/utils/contracts/agents";

describe("agents contracts utils", () => {
  describe("isAgentCapability", () => {
    it("returns true for all valid capabilities", () => {
      expect(isAgentCapability("explain")).toBe(true);
      expect(isAgentCapability("summarize")).toBe(true);
      expect(isAgentCapability("plan")).toBe(true);
      expect(isAgentCapability("classify")).toBe(true);
      expect(isAgentCapability("extract")).toBe(true);
      expect(isAgentCapability("custom")).toBe(true);
    });

    it("returns false for invalid capabilities", () => {
      expect(isAgentCapability("")).toBe(false);
      expect(isAgentCapability("unknown")).toBe(false);
      expect(isAgentCapability("explainx")).toBe(false);
      expect(isAgentCapability("CUSTOM")).toBe(false); // Case sensitive
      expect(isAgentCapability("null")).toBe(false);
      expect(isAgentCapability("undefined")).toBe(false);
    });
  });

  describe("isAgentProviderProtocol", () => {
    it("returns true for all valid provider protocols", () => {
      expect(isAgentProviderProtocol("finance_app_v1")).toBe(true);
      expect(isAgentProviderProtocol("json_rpc_2_0")).toBe(true);
    });

    it("returns false for invalid provider protocols", () => {
      expect(isAgentProviderProtocol("")).toBe(false);
      expect(isAgentProviderProtocol("unknown")).toBe(false);
      expect(isAgentProviderProtocol("finance_app_v2")).toBe(false);
      expect(isAgentProviderProtocol("JSON_RPC_2_0")).toBe(false); // Case sensitive
      expect(isAgentProviderProtocol("null")).toBe(false);
      expect(isAgentProviderProtocol("undefined")).toBe(false);
    });
  });
});
