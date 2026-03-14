jest.mock("@/utils/services/backendClient", () => ({
  backendClient: {
    get: jest.fn(),
    post: jest.fn(),
    getWithMeta: jest.fn(),
    postWithMeta: jest.fn(),
  },
}));

import {
  fetchLinkedAccounts,
  fetchLinkedAccountsForLinkVerification,
  fetchLinkedAccountsWithMeta,
  getPlaidLinkToken,
  exchangePlaidPublicToken,
  isLivePlaidLinkEnabled,
  isMockDataEnabled,
  isPlaidSandboxLinkEnabled,
  isRealAccountDataEnabled,
  validateManualAccount,
} from "@/utils/account";
import { backendClient } from "@/utils/services/backendClient";

const mockedBackendClient = backendClient as jest.Mocked<typeof backendClient>;

const samplePlaidAccount = {
  account_id: "acc-1",
  name: "Checking",
  type: "depository",
  subtype: "checking",
};

describe("account utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("parses rollout flags", () => {
    expect(isMockDataEnabled("true")).toBe(true);
    expect(isMockDataEnabled("false")).toBe(false);

    expect(isPlaidSandboxLinkEnabled("true")).toBe(true);
    expect(isPlaidSandboxLinkEnabled("false")).toBe(false);

    expect(isRealAccountDataEnabled("true")).toBe(true);
    expect(isRealAccountDataEnabled("false")).toBe(false);

    expect(
      isLivePlaidLinkEnabled({
        sandboxFlag: "true",
      }),
    ).toBe(true);
    expect(
      isLivePlaidLinkEnabled({
        sandboxFlag: "true",
      }),
    ).toBe(true);
    expect(isLivePlaidLinkEnabled({ sandboxFlag: "false" })).toBe(false);
  });

  describe("validateManualAccount", () => {
    it("returns an error if both name and balance are missing", () => {
      expect(validateManualAccount({ name: "", balance: "" })).toBe(
        "Please enter both account name and balance.",
      );
    });

    it("returns an error if name is missing but balance is provided", () => {
      expect(validateManualAccount({ name: "", balance: "1000" })).toBe(
        "Please enter both account name and balance.",
      );
    });

    it("returns an error if balance is missing but name is provided", () => {
      expect(validateManualAccount({ name: "Cash", balance: "" })).toBe(
        "Please enter both account name and balance.",
      );
    });

    it("returns null if both name and balance are provided", () => {
      expect(
        validateManualAccount({ name: "Cash", balance: "1000" }),
      ).toBeNull();
    });
  });

  it("maps plaid accounts payload from structured response", async () => {
    mockedBackendClient.postWithMeta.mockResolvedValue({
      data: {
        accounts: [samplePlaidAccount],
        request_id: "request-body-1",
      },
      requestId: "request-header-1",
    });

    const accounts = await fetchLinkedAccounts("user-1", "true");
    expect(accounts).toEqual([samplePlaidAccount]);
  });

  it("returns response metadata for plaid accounts", async () => {
    mockedBackendClient.postWithMeta.mockResolvedValue({
      data: [samplePlaidAccount],
      requestId: "request-header-2",
    });

    const result = await fetchLinkedAccountsWithMeta("user-2", "true");
    expect(result).toEqual({
      accounts: [samplePlaidAccount],
      requestId: "request-header-2",
    });
  });

  it("blocks plaid token exchange when live-link flags are disabled", async () => {
    await expect(
      getPlaidLinkToken("user-3", undefined, {
        sandboxFlag: "false",
      }),
    ).rejects.toThrow("Live Plaid sandbox linking is disabled.");
    await expect(
      exchangePlaidPublicToken("public-token", "user-3", {
        sandboxFlag: "false",
      }),
    ).rejects.toThrow("Live Plaid sandbox linking is disabled.");
    expect(mockedBackendClient.post).not.toHaveBeenCalled();
  });

  it("allows live sandbox linking during phase A2 without real summary enabled", async () => {
    mockedBackendClient.post
      .mockResolvedValueOnce({
        link_token: "link-token",
        sandbox_public_token: "public-sandbox-token",
      })
      .mockResolvedValueOnce({
        item_id: "item-1",
        accounts_linked: 2,
      });

    await expect(
      getPlaidLinkToken("user-a2", undefined, {
        sandboxFlag: "true",
        realDataFlag: "false",
      }),
    ).resolves.toEqual({
      link_token: "link-token",
      sandbox_public_token: "public-sandbox-token",
    });
    await expect(
      exchangePlaidPublicToken("public-sandbox-token", "user-a2", {
        sandboxFlag: "true",
        realDataFlag: "false",
      }),
    ).resolves.toEqual({
      item_id: "item-1",
      accounts_linked: 2,
    });

    expect(mockedBackendClient.post).toHaveBeenNthCalledWith(
      1,
      "/plaidLinkToken",
      {
        userId: "user-a2",
        sandbox_auto_link: true,
      },
    );
    expect(mockedBackendClient.post).toHaveBeenNthCalledWith(
      2,
      "/plaidExchangeToken",
      {
        public_token: "public-sandbox-token",
        userId: "user-a2",
      },
    );
  });

  it("blocks linked-account fetches when real data is disabled", async () => {
    await expect(fetchLinkedAccounts("user-4", "false")).rejects.toThrow(
      "Real account data is disabled.",
    );
    await expect(
      fetchLinkedAccountsWithMeta("user-4", "false"),
    ).rejects.toThrow("Real account data is disabled.");
    expect(mockedBackendClient.postWithMeta).not.toHaveBeenCalled();
  });

  it("allows link verification fetches when sandbox linking is enabled", async () => {
    mockedBackendClient.postWithMeta.mockResolvedValue({
      data: {
        accounts: [samplePlaidAccount],
        request_id: "request-body-2",
      },
      requestId: "request-header-2",
    });

    const result = await fetchLinkedAccountsForLinkVerification("user-5", {
      sandboxFlag: "true",
    });

    expect(result).toEqual({
      accounts: [samplePlaidAccount],
      requestId: "request-body-2",
    });
  });
});
