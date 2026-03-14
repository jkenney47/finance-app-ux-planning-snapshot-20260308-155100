import { create } from "zustand";

export type AskContextPayload = {
  screen: string;
  stepId?: string;
  metricId?: string;
  recommendationId?: string;
};

type AskState = {
  isOpen: boolean;
  context: AskContextPayload;
  setScreenContext: (screen: string) => void;
  setContext: (partial: Partial<AskContextPayload>) => void;
  open: (context?: Partial<AskContextPayload>) => void;
  close: () => void;
};

export const useAskStore = create<AskState>((set) => ({
  isOpen: false,
  context: {
    screen: "home",
  },
  setScreenContext: (screen) =>
    set((state) => ({
      context:
        state.context.screen === screen
          ? {
              ...state.context,
              screen,
            }
          : {
              screen,
            },
    })),
  setContext: (partial) =>
    set((state) => ({
      context: {
        ...state.context,
        ...partial,
      },
    })),
  open: (context) =>
    set((state) => ({
      isOpen: true,
      context: {
        ...state.context,
        ...context,
      },
    })),
  close: () => set({ isOpen: false }),
}));
