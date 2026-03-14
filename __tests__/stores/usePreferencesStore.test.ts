import {
  PREFERENCES_STORE_NAME,
  usePreferencesStore,
} from "@/stores/usePreferencesStore";

type PersistedEnvelope = {
  state: Record<string, unknown>;
  version: number;
};

function resetPreferencesStore(): void {
  usePreferencesStore.setState({
    themePreference: "system",
    advisorVoice: "neutral",
    enableHaptics: true,
    densityMode: "comfortable",
    pinnedFocusMetric: "dynamic",
  });
}

function writePersistedPreferences(state: PersistedEnvelope["state"]): void {
  const payload: PersistedEnvelope = { state, version: 1 };
  localStorage.setItem(PREFERENCES_STORE_NAME, JSON.stringify(payload));
}

describe("usePreferencesStore", () => {
  beforeEach(() => {
    localStorage.clear();
    resetPreferencesStore();
  });

  it("updates preferences via focused actions", () => {
    usePreferencesStore.getState().setThemePreference("light");
    usePreferencesStore.getState().setAdvisorVoice("direct");
    usePreferencesStore.getState().setDensityMode("compact");
    usePreferencesStore.getState().setPinnedFocusMetric("cash_runway");
    usePreferencesStore.getState().toggleHaptics();

    const state = usePreferencesStore.getState();
    expect(state.themePreference).toBe("light");
    expect(state.advisorVoice).toBe("direct");
    expect(state.densityMode).toBe("compact");
    expect(state.pinnedFocusMetric).toBe("cash_runway");
    expect(state.enableHaptics).toBe(false);
  });

  it("rehydrates valid persisted preferences", async () => {
    writePersistedPreferences({
      themePreference: "dark",
      advisorVoice: "encouraging",
      enableHaptics: false,
      densityMode: "compact",
      pinnedFocusMetric: "cash_flow",
    });

    await usePreferencesStore.persist.rehydrate();

    const state = usePreferencesStore.getState();
    expect(state.themePreference).toBe("dark");
    expect(state.advisorVoice).toBe("encouraging");
    expect(state.enableHaptics).toBe(false);
    expect(state.densityMode).toBe("compact");
    expect(state.pinnedFocusMetric).toBe("cash_flow");
  });

  it("sanitizes invalid persisted values and keeps defaults", async () => {
    writePersistedPreferences({
      themePreference: "neon",
      advisorVoice: "strict",
      enableHaptics: "yes",
      densityMode: "dense",
      pinnedFocusMetric: "portfolio",
    });

    await usePreferencesStore.persist.rehydrate();

    const state = usePreferencesStore.getState();
    expect(state.themePreference).toBe("system");
    expect(state.advisorVoice).toBe("neutral");
    expect(state.enableHaptics).toBe(true);
    expect(state.densityMode).toBe("comfortable");
    expect(state.pinnedFocusMetric).toBe("dynamic");
  });

  it("merges mixed persisted values, keeping only valid fields", async () => {
    writePersistedPreferences({
      themePreference: "light",
      advisorVoice: "direct",
      enableHaptics: false,
      densityMode: "invalid-density",
      pinnedFocusMetric: "roadmap_progress",
    });

    await usePreferencesStore.persist.rehydrate();

    const state = usePreferencesStore.getState();
    expect(state.themePreference).toBe("light");
    expect(state.advisorVoice).toBe("direct");
    expect(state.enableHaptics).toBe(false);
    expect(state.densityMode).toBe("comfortable");
    expect(state.pinnedFocusMetric).toBe("roadmap_progress");
  });
});
