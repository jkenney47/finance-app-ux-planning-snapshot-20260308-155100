import { create } from "zustand";

export type BannerVariant = "error" | "success" | "info";

export type BannerState = {
  visible: boolean;
  message: string;
  variant: BannerVariant;
  actionLabel?: string;
  onAction?: () => void;
};

export type BannerStore = BannerState & {
  show: (
    message: string,
    variant?: BannerVariant,
    options?: Partial<Pick<BannerState, "actionLabel" | "onAction">>,
  ) => void;
  dismiss: () => void;
};

const initialState: BannerState = {
  visible: false,
  message: "",
  variant: "info",
  actionLabel: undefined,
  onAction: undefined,
};

export const useErrorBannerStore = create<BannerStore>((set) => ({
  ...initialState,
  show: (message, variant = "error", options) =>
    set(() => ({
      visible: true,
      message,
      variant,
      actionLabel: options?.actionLabel,
      onAction: options?.onAction,
    })),
  dismiss: () =>
    set(() => ({
      ...initialState,
    })),
}));
