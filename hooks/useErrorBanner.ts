import { useCallback } from "react";

import type { BannerState, BannerVariant } from "@/stores/useErrorBannerStore";
import { useErrorBannerStore } from "@/stores/useErrorBannerStore";

type UseErrorBannerResult = {
  visible: boolean;
  message: string;
  variant: BannerVariant;
  actionLabel: string | undefined;
  onAction: (() => void) | undefined;
  show: (
    message: string,
    variant?: BannerVariant,
    options?: Partial<Pick<BannerState, "actionLabel" | "onAction">>,
  ) => void;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
  showInfo: (message: string) => void;
  dismiss: () => void;
};

export function useErrorBanner(): UseErrorBannerResult {
  const visible = useErrorBannerStore((state) => state.visible);
  const message = useErrorBannerStore((state) => state.message);
  const variant = useErrorBannerStore((state) => state.variant);
  const actionLabel = useErrorBannerStore((state) => state.actionLabel);
  const onAction = useErrorBannerStore((state) => state.onAction);
  const show = useErrorBannerStore((state) => state.show);
  const dismiss = useErrorBannerStore((state) => state.dismiss);

  const showError = useCallback(
    (message: string) => {
      show(message, "error");
    },
    [show],
  );

  const showSuccess = useCallback(
    (message: string) => {
      show(message, "success");
    },
    [show],
  );

  const showInfo = useCallback(
    (message: string) => {
      show(message, "info");
    },
    [show],
  );

  return {
    visible,
    message,
    variant,
    actionLabel,
    onAction,
    show,
    showError,
    showSuccess,
    showInfo,
    dismiss,
  };
}
