import type { AdvisorVoice } from "@/stores/usePreferencesStore";

export function homeStageSubtext(voice: AdvisorVoice, stage: string): string {
  if (voice === "encouraging") {
    return `${stage} priorities are active. You are making steady progress.`;
  }

  if (voice === "direct") {
    return `${stage} priorities are active. Focus on the highest-impact step now.`;
  }

  return `Focus now: ${stage} priorities.`;
}

export function nextStepContextLine(
  voice: AdvisorVoice,
  isLoading: boolean,
): string {
  if (isLoading) {
    return "Using your linked data and profile details";
  }

  if (voice === "encouraging") {
    return "Guidance based on your linked data and profile answers. Keep the momentum going.";
  }

  if (voice === "direct") {
    return "Guidance based on current linked data and profile answers. Priority order is enforced.";
  }

  return "Guidance based on your linked data and profile answers";
}
