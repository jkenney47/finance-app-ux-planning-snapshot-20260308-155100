import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistStorage } from "@/stores/persistStorage";

export const THEME_PREFERENCES = ["system", "light", "dark"] as const;
export const DENSITY_MODES = ["comfortable", "compact"] as const;
export const ADVISOR_VOICES = ["neutral", "encouraging", "direct"] as const;
export const FOCUS_METRIC_PREFERENCES = [
  "dynamic",
  "accounts_linked",
  "cash_flow",
  "cash_runway",
  "roadmap_progress",
  "next_step",
] as const;
export const PREFERENCES_STORE_NAME = "preferences-store";

export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type DensityMode = (typeof DENSITY_MODES)[number];
export type AdvisorVoice = (typeof ADVISOR_VOICES)[number];
export type FocusMetricPreference = (typeof FOCUS_METRIC_PREFERENCES)[number];

type PreferencesState = {
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
  advisorVoice: AdvisorVoice;
  setAdvisorVoice: (voice: AdvisorVoice) => void;
  enableHaptics: boolean;
  toggleHaptics: () => void;
  densityMode: DensityMode;
  setDensityMode: (mode: DensityMode) => void;
  pinnedFocusMetric: FocusMetricPreference;
  setPinnedFocusMetric: (metric: FocusMetricPreference) => void;
};

type PersistedPreferencesState = Pick<
  PreferencesState,
  | "themePreference"
  | "advisorVoice"
  | "enableHaptics"
  | "densityMode"
  | "pinnedFocusMetric"
>;

function isThemePreference(value: unknown): value is ThemePreference {
  return (
    typeof value === "string" &&
    (THEME_PREFERENCES as readonly string[]).includes(value)
  );
}

function isDensityMode(value: unknown): value is DensityMode {
  return (
    typeof value === "string" &&
    (DENSITY_MODES as readonly string[]).includes(value)
  );
}

function isAdvisorVoice(value: unknown): value is AdvisorVoice {
  return (
    typeof value === "string" &&
    (ADVISOR_VOICES as readonly string[]).includes(value)
  );
}

function isFocusMetricPreference(
  value: unknown,
): value is FocusMetricPreference {
  return (
    typeof value === "string" &&
    (FOCUS_METRIC_PREFERENCES as readonly string[]).includes(value)
  );
}

function sanitizePersistedPreferences(
  persistedState: unknown,
): Partial<PersistedPreferencesState> {
  if (!persistedState || typeof persistedState !== "object") {
    return {};
  }

  const persisted = persistedState as Partial<PersistedPreferencesState>;
  const sanitized: Partial<PersistedPreferencesState> = {};

  if (isThemePreference(persisted.themePreference)) {
    sanitized.themePreference = persisted.themePreference;
  }

  if (isAdvisorVoice(persisted.advisorVoice)) {
    sanitized.advisorVoice = persisted.advisorVoice;
  }

  if (typeof persisted.enableHaptics === "boolean") {
    sanitized.enableHaptics = persisted.enableHaptics;
  }

  if (isDensityMode(persisted.densityMode)) {
    sanitized.densityMode = persisted.densityMode;
  }

  if (isFocusMetricPreference(persisted.pinnedFocusMetric)) {
    sanitized.pinnedFocusMetric = persisted.pinnedFocusMetric;
  }

  return sanitized;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      themePreference: "system",
      setThemePreference: (themePreference) => set({ themePreference }),
      advisorVoice: "neutral",
      setAdvisorVoice: (advisorVoice) => set({ advisorVoice }),
      enableHaptics: true,
      toggleHaptics: () =>
        set((state) => ({ enableHaptics: !state.enableHaptics })),
      densityMode: "comfortable",
      setDensityMode: (densityMode) => set({ densityMode }),
      pinnedFocusMetric: "dynamic",
      setPinnedFocusMetric: (pinnedFocusMetric) => set({ pinnedFocusMetric }),
    }),
    {
      name: PREFERENCES_STORE_NAME,
      version: 1,
      storage: persistStorage,
      partialize: (state): PersistedPreferencesState => ({
        themePreference: state.themePreference,
        advisorVoice: state.advisorVoice,
        enableHaptics: state.enableHaptics,
        densityMode: state.densityMode,
        pinnedFocusMetric: state.pinnedFocusMetric,
      }),
      merge: (persistedState, currentState): PreferencesState => ({
        ...currentState,
        ...sanitizePersistedPreferences(persistedState),
      }),
    },
  ),
);
