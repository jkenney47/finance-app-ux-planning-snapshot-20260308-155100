import { useColorScheme } from "react-native";

import { usePreferencesStore } from "@/stores/usePreferencesStore";
import { resolveThemeMode } from "@/theme/theme-mode";
import { tokens } from "./tokens";

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

export type AppTheme = {
  dark: boolean;
  roundness: number;
  spacing: {
    sm: number;
    md: number;
    lg: number;
  };
  colors: AppThemeColors & {
    primary: string;
    secondary: string;
    tertiary: string;
    surface: string;
    background: string;
    surfaceVariant: string;
    outline: string;
    outlineVariant: string;
    onBackground: string;
    onSurface: string;
    onSurfaceVariant: string;
    error: string;
    onPrimary: string;
  };
};

function buildTheme(mode: "light" | "dark"): AppTheme {
  const palette = mode === "dark" ? tokens.color.dark : tokens.color.light;
  const isDark = mode === "dark";

  return {
    dark: isDark,
    roundness: tokens.radius.md,
    spacing: {
      sm: tokens.space.sm,
      md: tokens.space.md,
      lg: tokens.space.lg,
    },
    colors: {
      ...palette,
      primary: palette.accent,
      secondary: palette.info,
      tertiary: palette.accent,
      surface: palette.surface1,
      background: palette.bg,
      surfaceVariant: palette.surface2,
      outline: palette.borderStrong,
      outlineVariant: palette.borderSubtle,
      onBackground: palette.text,
      onSurface: palette.text,
      onSurfaceVariant: palette.textMuted,
      error: palette.negative,
      onPrimary: isDark ? "#06271D" : "#031B14",
    },
  };
}

export const lightTheme: AppTheme = buildTheme("light");

export const darkTheme: AppTheme = buildTheme("dark");

export function usePaperTheme(): AppTheme {
  const preference = usePreferencesStore((state) => state.themePreference);
  const scheme = useColorScheme();
  const resolvedMode = resolveThemeMode(preference, scheme);

  return resolvedMode === "light" ? lightTheme : darkTheme;
}
