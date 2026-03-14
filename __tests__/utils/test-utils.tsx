import { RenderOptions, render as rtlRender } from "@testing-library/react";
import { fireEvent, screen } from "@testing-library/dom";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppThemeModeProvider } from "@/hooks/useAppTheme";

type ExtendedRenderOptions = Omit<RenderOptions, "queries"> & {
  theme?: {
    dark: boolean;
  };
};

export function render(
  ui: React.ReactElement,
  { theme, ...options }: ExtendedRenderOptions = {},
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <SafeAreaProvider>
        <AppThemeModeProvider isDark={theme?.dark}>
          {children}
        </AppThemeModeProvider>
      </SafeAreaProvider>
    );
  }

  const result = rtlRender(ui, { wrapper: Wrapper, ...options });

  return {
    ...result,
    toJSON: () => result.container.firstChild,
  };
}

export { fireEvent, screen };
export * from "@testing-library/react";
