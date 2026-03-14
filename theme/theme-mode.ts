import type { ColorSchemeName } from "react-native";

import type { ThemePreference } from "@/stores/usePreferencesStore";

export function resolveThemeMode(
  preference: ThemePreference,
  scheme: ColorSchemeName,
): "light" | "dark" {
  return preference === "system"
    ? scheme === "light"
      ? "light"
      : "dark"
    : preference;
}

export function resolveIsDark(
  preference: ThemePreference,
  scheme: ColorSchemeName,
): boolean {
  return resolveThemeMode(preference, scheme) === "dark";
}
