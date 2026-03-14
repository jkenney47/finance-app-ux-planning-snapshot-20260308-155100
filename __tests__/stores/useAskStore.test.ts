import { useAskStore } from "@/stores/useAskStore";

function resetAskStore(): void {
  useAskStore.setState({
    isOpen: false,
    context: {
      screen: "home",
    },
  });
}

describe("useAskStore", () => {
  beforeEach(() => {
    resetAskStore();
  });

  it("clears stale context fields when screen changes", () => {
    useAskStore.getState().setContext({
      screen: "insights",
      metricId: "cash_flow_trend",
      recommendationId: "build_fortress_fund",
      stepId: "build_fortress_fund",
    });

    useAskStore.getState().setScreenContext("profile");

    const state = useAskStore.getState();
    expect(state.context.screen).toBe("profile");
    expect(state.context.metricId).toBeUndefined();
    expect(state.context.recommendationId).toBeUndefined();
    expect(state.context.stepId).toBeUndefined();
  });

  it("opens and closes while preserving merged context", () => {
    useAskStore.getState().open({
      screen: "roadmap",
      recommendationId: "build_fortress_fund",
    });

    expect(useAskStore.getState().isOpen).toBe(true);
    expect(useAskStore.getState().context.screen).toBe("roadmap");
    expect(useAskStore.getState().context.recommendationId).toBe(
      "build_fortress_fund",
    );

    useAskStore.getState().close();
    expect(useAskStore.getState().isOpen).toBe(false);
  });
});
