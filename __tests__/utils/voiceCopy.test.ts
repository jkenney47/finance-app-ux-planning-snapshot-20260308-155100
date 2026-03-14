import {
  homeStageSubtext,
  nextStepContextLine,
} from "@/utils/roadmap/voiceCopy";

describe("voice copy helpers", () => {
  it("avoids redundant stage phrasing on home subtext", () => {
    expect(homeStageSubtext("neutral", "Foundation")).toBe(
      "Focus now: Foundation priorities.",
    );
    expect(homeStageSubtext("encouraging", "Growth")).toBe(
      "Growth priorities are active. You are making steady progress.",
    );
    expect(homeStageSubtext("direct", "Optimization")).toBe(
      "Optimization priorities are active. Focus on the highest-impact step now.",
    );
  });

  it("keeps next-step context line variants stable", () => {
    expect(nextStepContextLine("neutral", true)).toBe(
      "Using your linked data and profile details",
    );
    expect(nextStepContextLine("neutral", false)).toBe(
      "Guidance based on your linked data and profile answers",
    );
    expect(nextStepContextLine("encouraging", false)).toBe(
      "Guidance based on your linked data and profile answers. Keep the momentum going.",
    );
  });
});
