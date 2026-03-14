jest.mock("@/utils/supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

import { submitOnboarding, validateOnboarding } from "@/utils/onboarding";
import { supabase } from "@/utils/supabaseClient";

const mockedSupabase = supabase as unknown as {
  auth: { getUser: jest.Mock };
  from: jest.Mock;
};

const validOnboardingData = {
  accounts: [],
  manualAccount: { name: "Checking", balance: "1500" },
  goals: ["Build emergency fund", "Pay off debt"],
  otherGoal: "Start investing",
  risk: "balanced",
  nudges: true,
};

describe("submitOnboarding", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns auth error when no user is signed in", async () => {
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    } as never);

    const result = await submitOnboarding(validOnboardingData);

    expect(result).toEqual({
      success: false,
      error: "User not authenticated",
    });
    expect(mockedSupabase.from).not.toHaveBeenCalled();
  });

  it("persists onboarding data using supported tables", async () => {
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    } as never);

    const upsert = jest.fn().mockResolvedValue({ error: null });
    const selectEq = jest.fn().mockResolvedValue({
      data: [{ name: "Build emergency fund" }],
      error: null,
    });
    const select = jest.fn().mockReturnValue({ eq: selectEq });
    const insert = jest.fn().mockResolvedValue({ error: null });

    mockedSupabase.from.mockImplementation((table: string) => {
      if (table === "accounts") {
        return { upsert } as never;
      }
      if (table === "user_goals") {
        return { select, insert } as never;
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    const result = await submitOnboarding(validOnboardingData);

    expect(result).toEqual({ success: true });
    expect(mockedSupabase.from).toHaveBeenCalledWith("accounts");
    expect(mockedSupabase.from).toHaveBeenCalledWith("user_goals");
    expect(mockedSupabase.from).not.toHaveBeenCalledWith("users");
    expect(upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          user_id: "user-1",
          plaid_item_id: "manual",
          plaid_account_id: "manual-primary",
          account_name: "Checking",
          account_type: "manual",
          account_subtype: "manual",
          balance: 1500,
        }),
      ],
      { onConflict: "user_id,plaid_account_id" },
    );
    expect(insert).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: "user-1",
        name: "Pay off debt",
        target_amount: 0,
        saved_amount: 0,
        status: "active",
      }),
      expect.objectContaining({
        user_id: "user-1",
        name: "Start investing",
        target_amount: 0,
        saved_amount: 0,
        status: "active",
      }),
    ]);
  });

  it("rejects unparseable manual balances instead of saving zero", async () => {
    mockedSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    } as never);

    const result = await submitOnboarding({
      ...validOnboardingData,
      manualAccount: { name: "Checking", balance: "abc123" },
    });

    expect(result).toEqual({
      success: false,
      error: "Manual account balance must be a valid number.",
    });
    expect(mockedSupabase.from).not.toHaveBeenCalledWith("accounts");
  });
});

describe("validateOnboarding", () => {
  it("returns manual account error when account fields are missing", () => {
    const result = validateOnboarding({
      accounts: [],
      manualAccount: { name: "", balance: "" },
      goals: ["Build emergency fund"],
      otherGoal: "",
      risk: "balanced",
      nudges: true,
    });

    expect(result.manualAccount).toBe(
      "Please enter both account name and balance.",
    );
  });

  it("returns goals error when no goals are selected", () => {
    const result = validateOnboarding({
      accounts: [],
      manualAccount: { name: "Checking", balance: "1500" },
      goals: [],
      otherGoal: "",
      risk: "balanced",
      nudges: true,
    });

    expect(result.goals).toBe(
      "Please select at least one goal or enter a custom goal.",
    );
  });

  it("returns manual account error when balance is not numeric", () => {
    const result = validateOnboarding({
      accounts: [],
      manualAccount: { name: "Checking", balance: "bad input" },
      goals: ["Build emergency fund"],
      otherGoal: "",
      risk: "balanced",
      nudges: true,
    });

    expect(result.manualAccount).toBe("Please enter a valid numeric balance.");
  });

  it("returns risk error when risk profile is missing", () => {
    const result = validateOnboarding({
      accounts: [],
      manualAccount: { name: "Checking", balance: "1500" },
      goals: ["Pay off debt"],
      otherGoal: "",
      risk: "",
      nudges: false,
    });

    expect(result.risk).toBe("Please select your risk profile.");
  });
});
