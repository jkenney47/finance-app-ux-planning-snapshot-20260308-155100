jest.mock("@/utils/supabaseClient", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock("@/utils/mocks/mockScenarios", () => ({
  getMockScenario: jest.fn(),
  applyMockPolicyScenario: jest.fn(),
}));

import {
  fetchRemotePolicyBundle,
  getPolicyBundle,
  toPolicyPack,
} from "@/utils/queries/usePolicyBundle";
import {
  applyMockPolicyScenario,
  getMockScenario,
} from "@/utils/mocks/mockScenarios";
import { supabase } from "@/utils/supabaseClient";

type SupabaseResult = {
  data: unknown[] | null;
  error: { message: string } | null;
};

const mockedSupabase = supabase as jest.Mocked<typeof supabase>;
const mockedGetMockScenario = getMockScenario as jest.MockedFunction<
  typeof getMockScenario
>;
const mockedApplyMockPolicyScenario =
  applyMockPolicyScenario as jest.MockedFunction<
    typeof applyMockPolicyScenario
  >;

function setSupabaseResult(result: SupabaseResult) {
  const chain = {
    select: jest.fn(),
    eq: jest.fn(),
    lte: jest.fn(),
    order: jest.fn().mockResolvedValue(result),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.lte.mockReturnValue(chain);
  mockedSupabase.from.mockReturnValue(chain as never);
}

describe("usePolicyBundle helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetMockScenario.mockReturnValue("default");
    mockedApplyMockPolicyScenario.mockImplementation((bundle) => bundle);
    delete process.env.EXPO_PUBLIC_ENABLE_REMOTE_POLICY_PACKS;
  });

  it("returns null for unsupported domains", () => {
    const result = toPolicyPack({
      domain: "unknown-domain",
      region: "US",
      jurisdiction: "federal",
      version: 1,
      effective_from: "2026-01-01T00:00:00.000Z",
      effective_to: null,
      approved_at: null,
      updated_at: "2026-01-01T00:00:00.000Z",
      source: null,
      status: "approved",
      pack: {},
    });

    expect(result).toBeNull();
  });

  it("fetches and merges remote approved packs by domain", async () => {
    setSupabaseResult({
      error: null,
      data: [
        {
          domain: "rates",
          region: "US",
          jurisdiction: "federal",
          version: 3,
          effective_from: "2026-02-01T00:00:00.000Z",
          effective_to: null,
          approved_at: "2026-02-01T00:00:00.000Z",
          updated_at: "2026-02-01T00:00:00.000Z",
          source: "remote",
          status: "approved",
          pack: { riskFreeRateApy: 0.05 },
        },
        {
          domain: "rates",
          region: "US",
          jurisdiction: "federal",
          version: 2,
          effective_from: "2026-01-01T00:00:00.000Z",
          effective_to: null,
          approved_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          source: "remote",
          status: "approved",
          pack: { riskFreeRateApy: 0.03 },
        },
        {
          domain: "thresholds",
          region: "US",
          jurisdiction: "federal",
          version: 5,
          effective_from: "2026-02-01T00:00:00.000Z",
          effective_to: null,
          approved_at: "2026-02-01T00:00:00.000Z",
          updated_at: "2026-02-01T00:00:00.000Z",
          source: "remote",
          status: "approved",
          pack: { starterFundFloor: 3000 },
        },
        {
          domain: "not_real",
          region: "US",
          jurisdiction: "federal",
          version: 1,
          effective_from: "2026-02-01T00:00:00.000Z",
          effective_to: null,
          approved_at: "2026-02-01T00:00:00.000Z",
          updated_at: "2026-02-01T00:00:00.000Z",
          source: "remote",
          status: "approved",
          pack: { ignored: true },
        },
      ],
    });

    const bundle = await fetchRemotePolicyBundle();
    const ratesPack = bundle.domains.rates;
    const thresholdsPack = bundle.domains.thresholds;

    expect(mockedSupabase.from).toHaveBeenCalledWith("policy_packs");
    expect(ratesPack).toBeDefined();
    expect(thresholdsPack).toBeDefined();
    expect(ratesPack?.version).toBe(3);
    expect(thresholdsPack?.version).toBe(5);
  });

  it("falls back to defaults when remote fetch is empty or errors", async () => {
    setSupabaseResult({ data: [], error: null });
    const emptyBundle = await fetchRemotePolicyBundle();
    expect(emptyBundle.domains.rates).toBeTruthy();

    setSupabaseResult({ data: null, error: { message: "db unavailable" } });
    const errorBundle = await fetchRemotePolicyBundle();
    expect(errorBundle.domains.thresholds).toBeTruthy();
  });

  it("returns scenario-adjusted default bundle when remote packs are disabled", async () => {
    process.env.EXPO_PUBLIC_ENABLE_REMOTE_POLICY_PACKS = "false";
    setSupabaseResult({ data: [], error: null });
    mockedGetMockScenario.mockReturnValue("partial_facts");

    const bundle = await getPolicyBundle();

    expect(bundle.domains.rates).toBeTruthy();
    expect(mockedGetMockScenario).toHaveBeenCalled();
    expect(mockedApplyMockPolicyScenario).toHaveBeenCalledTimes(1);
    expect(mockedSupabase.from).not.toHaveBeenCalled();
  });
});
