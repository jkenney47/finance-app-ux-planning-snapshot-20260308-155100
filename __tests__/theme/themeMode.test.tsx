import { usePreferencesStore } from "@/stores/usePreferencesStore";
import { darkTheme, lightTheme, usePaperTheme } from "@/theme/paper";
import { resolveIsDark, resolveThemeMode } from "@/theme/theme-mode";
import { act, cleanup, render, screen } from "@test-utils";
import * as reactNative from "react-native";

function ThemeProbe() {
  const theme = usePaperTheme();

  return (
    <div data-testid="theme-probe">
      {theme.dark ? "dark" : "light"}:{theme.colors.background}
    </div>
  );
}

describe("theme mode resolution", () => {
  function resetPreferencesStore(): void {
    usePreferencesStore.setState({
      themePreference: "system",
      advisorVoice: "neutral",
      enableHaptics: true,
      densityMode: "comfortable",
      pinnedFocusMetric: "dynamic",
    });
  }

  beforeEach(() => {
    act(() => {
      resetPreferencesStore();
    });
  });

  afterEach(() => {
    cleanup();
    act(() => {
      resetPreferencesStore();
    });
    jest.restoreAllMocks();
  });

  it("resolves system preference against the device scheme", () => {
    expect(resolveThemeMode("system", "light")).toBe("light");
    expect(resolveThemeMode("system", "dark")).toBe("dark");
    expect(resolveThemeMode("light", "dark")).toBe("light");
    expect(resolveThemeMode("dark", "light")).toBe("dark");
    expect(resolveIsDark("system", "dark")).toBe(true);
    expect(resolveIsDark("system", "light")).toBe(false);
  });

  it("returns the light compatibility theme for light mode", () => {
    jest.spyOn(reactNative, "useColorScheme").mockReturnValue("light");
    act(() => {
      usePreferencesStore.setState({ themePreference: "system" });
    });

    render(<ThemeProbe />);

    expect(screen.getByTestId("theme-probe")).toHaveTextContent(
      `light:${lightTheme.colors.background}`,
    );
  });

  it("returns the dark compatibility theme when preference overrides the scheme", () => {
    jest.spyOn(reactNative, "useColorScheme").mockReturnValue("light");
    act(() => {
      usePreferencesStore.setState({ themePreference: "dark" });
    });

    render(<ThemeProbe />);

    expect(screen.getByTestId("theme-probe")).toHaveTextContent(
      `dark:${darkTheme.colors.background}`,
    );
  });
});
