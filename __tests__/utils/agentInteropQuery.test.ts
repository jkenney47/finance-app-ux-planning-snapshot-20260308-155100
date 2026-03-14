import type { AgentWorkflowResult } from "@/utils/contracts/agents";
import {
  appendWorkflowHistory,
  clearWorkflowHistory,
} from "@/utils/queries/useAgentInterop";

function makeWorkflowResult(workflowId: string): AgentWorkflowResult {
  const nowIso = "2026-02-18T00:00:00.000Z";
  return {
    workflowId,
    status: "success",
    finalOutput: `output-${workflowId}`,
    startedAt: nowIso,
    completedAt: nowIso,
    durationMs: 10,
    metrics: {
      totalSteps: 2,
      successfulSteps: 2,
      failedSteps: 0,
      optionalFailures: 0,
      totalLatencyMs: 8,
      parallelGroups: [],
    },
    steps: [
      {
        stepId: "planner",
        providerKey: "provider-a",
        capability: "plan",
        required: true,
        status: "success",
        output: "ok",
        latencyMs: 4,
        startedAt: nowIso,
        completedAt: nowIso,
        warnings: [],
      },
      {
        stepId: "summary",
        providerKey: "provider-b",
        capability: "summarize",
        required: true,
        status: "success",
        output: "ok",
        latencyMs: 4,
        startedAt: nowIso,
        completedAt: nowIso,
        warnings: [],
      },
    ],
  };
}

describe("appendWorkflowHistory", () => {
  it("adds latest workflow result to the front and trims by maxEntries", () => {
    const first = appendWorkflowHistory(
      undefined,
      makeWorkflowResult("wf-1"),
      2,
    );
    const second = appendWorkflowHistory(first, makeWorkflowResult("wf-2"), 2);
    const third = appendWorkflowHistory(second, makeWorkflowResult("wf-3"), 2);

    expect(third).toHaveLength(2);
    expect(third[0]?.workflowId).toBe("wf-3");
    expect(third[1]?.workflowId).toBe("wf-2");
  });

  it("replaces existing entry for same workflow id", () => {
    const first = appendWorkflowHistory(
      undefined,
      makeWorkflowResult("wf-1"),
      5,
    );
    const updated = appendWorkflowHistory(first, makeWorkflowResult("wf-1"), 5);

    expect(updated).toHaveLength(1);
    expect(updated[0]?.workflowId).toBe("wf-1");
    expect(updated[0]?.recordedAt).toBeTruthy();
  });
});

describe("clearWorkflowHistory", () => {
  it("returns an empty workflow history array", () => {
    expect(clearWorkflowHistory()).toEqual([]);
  });
});
