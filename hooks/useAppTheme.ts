import {
  createElement,
  type ReactNode,
  createContext,
  useContext,
  useMemo,
} from "react";
import { useColorScheme } from "react-native";

import { usePreferencesStore } from "@/stores/usePreferencesStore";
import { resolveIsDark } from "@/theme/theme-mode";
import { tokens } from "@/theme/tokens";

type AppThemeColors = {
  bg: string;
  surface1: string;
  surface2: string;
  surface3: string;
  borderSubtle: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentSoft: string;
  positive: string;
  negative: string;
  warning: string;
  info: string;
};

type AppThemeModeOverride = {
  isDark?: boolean;
};

const AppThemeModeContext = createContext<AppThemeModeOverride | null>(null);

export function AppThemeModeProvider({
  children,
  isDark,
}: {
  children: ReactNode;
  isDark?: boolean;
}): JSX.Element {
  const value = useMemo(() => ({ isDark }), [isDark]);

  return createElement(AppThemeModeContext.Provider, { value }, children);
}

export function useAppTheme(): {
  isDark: boolean;
  colors: AppThemeColors;
  tokens: typeof tokens;
} {
  const override = useContext(AppThemeModeContext);
  const preference = usePreferencesStore((state) => state.themePreference);
  const scheme = useColorScheme();

  const isDark = useMemo(
    () => override?.isDark ?? resolveIsDark(preference, scheme),
    [override?.isDark, preference, scheme],
  );

  const colors = useMemo<AppThemeColors>(
    () => (isDark ? tokens.color.dark : tokens.color.light),
    [isDark],
  );

  return { isDark, colors, tokens };
}
