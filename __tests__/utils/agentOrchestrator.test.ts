import type {
  AgentInvocationRequest,
  AgentInvocationResponse,
  AgentWorkflowDefinition,
} from "@/utils/contracts/agents";
import { runAgentWorkflow } from "@/utils/services/agentOrchestrator";

function makeResponse(
  overrides: Partial<AgentInvocationResponse>,
): AgentInvocationResponse {
  return {
    requestId: "req-1",
    providerKey: "provider-1",
    capability: "plan",
    status: "success",
    output: "ok",
    latencyMs: 5,
    warnings: [],
    ...overrides,
  };
}

describe("runAgentWorkflow", () => {
  it("runs steps in sequence and renders template references", async () => {
    const invoker = jest
      .fn<Promise<AgentInvocationResponse>, [AgentInvocationRequest]>()
      .mockResolvedValueOnce(
        makeResponse({
          requestId: "req-1",
          providerKey: "planner-agent",
          capability: "plan",
          output: "Draft plan A",
        }),
      )
      .mockResolvedValueOnce(
        makeResponse({
          requestId: "req-2",
          providerKey: "critic-agent",
          capability: "explain",
          output: "Risk notes B",
        }),
      )
      .mockResolvedValueOnce(
        makeResponse({
          requestId: "req-3",
          providerKey: "summary-agent",
          capability: "summarize",
          output: "Final options C",
        }),
      );

    const definition: AgentWorkflowDefinition = {
      workflowId: "wf-sequence",
      initialInstruction: "Reduce debt faster.",
      steps: [
        {
          id: "planner",
          providerKey: "planner-agent",
          capability: "plan",
          instructionTemplate: "{{initial_instruction}}",
        },
        {
          id: "critic",
          providerKey: "critic-agent",
          capability: "explain",
          instructionTemplate: "Critique: {{steps.planner.output}}",
        },
        {
          id: "summarizer",
          providerKey: "summary-agent",
          capability: "summarize",
          instructionTemplate:
            "Finalize using {{steps.planner.output}} and {{steps.critic.output}}",
        },
      ],
    };

    const result = await runAgentWorkflow(definition, { invoker });

    expect(result.status).toBe("success");
    expect(result.finalOutput).toBe("Final options C");
    expect(result.metrics.totalSteps).toBe(3);
    expect(result.metrics.successfulSteps).toBe(3);
    expect(result.metrics.failedSteps).toBe(0);
    expect(result.metrics.parallelGroups).toEqual([]);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.steps).toHaveLength(3);
    expect(result.steps[0]?.required).toBe(true);
    expect(result.steps[0]?.startedAt).toBeTruthy();
    expect(result.steps[0]?.completedAt).toBeTruthy();
    expect(invoker).toHaveBeenCalledTimes(3);
    expect(invoker.mock.calls[0]?.[0].instruction).toBe("Reduce debt faster.");
    expect(invoker.mock.calls[1]?.[0].instruction).toBe(
      "Critique: Draft plan A",
    );
    expect(invoker.mock.calls[2]?.[0].instruction).toBe(
      "Finalize using Draft plan A and Risk notes B",
    );
  });

  it("continues after optional failures and returns partial_success", async () => {
    const invoker = jest
      .fn<Promise<AgentInvocationResponse>, [AgentInvocationRequest]>()
      .mockResolvedValueOnce(
        makeResponse({
          requestId: "req-1",
          providerKey: "planner-agent",
          capability: "plan",
          output: "Draft plan A",
        }),
      )
      .mockResolvedValueOnce(
        makeResponse({
          requestId: "req-2",
          providerKey: "critic-agent",
          capability: "explain",
          status: "provider_unavailable",
          output: "Critic unavailable.",
        }),
      )
      .mockResolvedValueOnce(
        makeResponse({
          requestId: "req-3",
          providerKey: "summary-agent",
          capability: "summarize",
          output: "Fallback summary.",
        }),
      );

    const definition: AgentWorkflowDefinition = {
      workflowId: "wf-partial",
      initialInstruction: "Build savings momentum.",
      steps: [
        {
          id: "planner",
          providerKey: "planner-agent",
          capability: "plan",
          instructionTemplate: "{{initial_instruction}}",
        },
        {
          id: "critic",
          providerKey: "critic-agent",
          capability: "explain",
          required: false,
          instructionTemplate: "Critique {{steps.planner.output}}",
        },
        {
          id: "summarizer",
          providerKey: "summary-agent",
          capability: "summarize",
          instructionTemplate: "Use previous result {{previous_output}}",
        },
      ],
    };

    const result = await runAgentWorkflow(definition, { invoker });

    expect(result.status).toBe("partial_success");
    expect(result.failedStepId).toBeUndefined();
    expect(result.finalOutput).toBe("Fallback summary.");
    expect(result.metrics.failedSteps).toBe(1);
    expect(result.metrics.optionalFailures).toBe(1);
    expect(invoker).toHaveBeenCalledTimes(3);
    expect(invoker.mock.calls[2]?.[0].instruction).toBe(
      "Use previous result Draft plan A",
    );
  });

  it("stops on required failures and returns failed state", async () => {
    const invoker = jest
      .fn<Promise<AgentInvocationResponse>, [AgentInvocationRequest]>()
      .mockResolvedValueOnce(
        makeResponse({
          requestId: "req-1",
          providerKey: "planner-agent",
          capability: "plan",
          output: "Draft plan A",
        }),
      )
      .mockResolvedValueOnce(
        makeResponse({
          requestId: "req-2",
          providerKey: "critic-agent",
          capability: "explain",
          status: "failed",
          output: "Critical failure.",
        }),
      );

    const definition: AgentWorkflowDefinition = {
      workflowId: "wf-failed",
      initialInstruction: "Refinance strategy.",
      steps: [
        {
          id: "planner",
          providerKey: "planner-agent",
          capability: "plan",
          instructionTemplate: "{{initial_instruction}}",
        },
        {
          id: "critic",
          providerKey: "critic-agent",
          capability: "explain",
          instructionTemplate: "Review {{steps.planner.output}}",
        },
        {
          id: "summarizer",
          providerKey: "summary-agent",
          capability: "summarize",
          instructionTemplate: "Should not run",
        },
      ],
    };

    const result = await runAgentWorkflow(definition, { invoker });

    expect(result.status).toBe("failed");
    expect(result.failedStepId).toBe("critic");
    expect(result.finalOutput).toBe("Critical failure.");
    expect(result.steps).toHaveLength(2);
    expect(invoker).toHaveBeenCalledTimes(2);
  });

  it("runs contiguous parallel-group steps before dependent summary step", async () => {
    const invoker = jest
      .fn<Promise<AgentInvocationResponse>, [AgentInvocationRequest]>()
      .mockResolvedValueOnce(
        makeResponse({
          requestId: "req-1",
          providerKey: "planner-agent",
          capability: "plan",
          output: "Draft plan A",
        }),
      )
      .mockResolvedValueOnce(
        makeResponse({
          requestId: "req-2",
          providerKey: "critic-agent",
          capability: "explain",
          output: "Critic notes B",
        }),
      )
      .mockResolvedValueOnce(
        makeResponse({
          requestId: "req-3",
          providerKey: "risk-agent",
          capability: "classify",
          output: "Risk check C",
        }),
      )
      .mockResolvedValueOnce(
        makeResponse({
          requestId: "req-4",
          providerKey: "summary-agent",
          capability: "summarize",
          output: "Final output D",
        }),
      );

    const definition: AgentWorkflowDefinition = {
      workflowId: "wf-parallel",
      initialInstruction: "Build options for debt payoff and liquidity.",
      steps: [
        {
          id: "planner",
          providerKey: "planner-agent",
          capability: "plan",
          instructionTemplate: "{{initial_instruction}}",
        },
        {
          id: "critic",
          providerKey: "critic-agent",
          capability: "explain",
          parallelGroup: "analysis",
          instructionTemplate: "Critique {{steps.planner.output}}",
        },
        {
          id: "risk_checker",
          providerKey: "risk-agent",
          capability: "classify",
          parallelGroup: "analysis",
          instructionTemplate: "Risk-check {{steps.planner.output}}",
        },
        {
          id: "summarizer",
          providerKey: "summary-agent",
          capability: "summarize",
          instructionTemplate:
            "Combine {{steps.critic.output}} and {{steps.risk_checker.output}}",
        },
      ],
    };

    const result = await runAgentWorkflow(definition, { invoker });

    expect(result.status).toBe("success");
    expect(result.finalOutput).toBe("Final output D");
    expect(result.metrics.parallelGroups).toEqual(["analysis"]);
    expect(invoker).toHaveBeenCalledTimes(4);
    expect(invoker.mock.calls[1]?.[0].instruction).toBe(
      "Critique Draft plan A",
    );
    expect(invoker.mock.calls[2]?.[0].instruction).toBe(
      "Risk-check Draft plan A",
    );
    expect(invoker.mock.calls[1]?.[0].context?.previousOutput).toBe(
      "Draft plan A",
    );
    expect(invoker.mock.calls[2]?.[0].context?.previousOutput).toBe(
      "Draft plan A",
    );
    expect(invoker.mock.calls[3]?.[0].instruction).toBe(
      "Combine Critic notes B and Risk check C",
    );
  });

  it("fails workflow when a required parallel-group step fails", async () => {
    const invoker = jest
      .fn<Promise<AgentInvocationResponse>, [AgentInvocationRequest]>()
      .mockResolvedValueOnce(
        makeResponse({
          requestId: "req-1",
          providerKey: "planner-agent",
          capability: "plan",
          output: "Draft plan A",
        }),
      )
      .mockResolvedValueOnce(
        makeResponse({
          requestId: "req-2",
          providerKey: "critic-agent",
          capability: "explain",
          status: "failed",
          output: "Critic hard failure.",
        }),
      )
      .mockResolvedValueOnce(
        makeResponse({
          requestId: "req-3",
          providerKey: "risk-agent",
          capability: "classify",
          output: "Risk check C",
        }),
      );

    const definition: AgentWorkflowDefinition = {
      workflowId: "wf-parallel-fail",
      initialInstruction: "Build options for debt payoff and liquidity.",
      steps: [
        {
          id: "planner",
          providerKey: "planner-agent",
          capability: "plan",
          instructionTemplate: "{{initial_instruction}}",
        },
        {
          id: "critic",
          providerKey: "critic-agent",
          capability: "explain",
          parallelGroup: "analysis",
          instructionTemplate: "Critique {{steps.planner.output}}",
        },
        {
          id: "risk_checker",
          providerKey: "risk-agent",
          capability: "classify",
          parallelGroup: "analysis",
          instructionTemplate: "Risk-check {{steps.planner.output}}",
        },
        {
          id: "summarizer",
          providerKey: "summary-agent",
          capability: "summarize",
          instructionTemplate: "Should not run",
        },
      ],
    };

    const result = await runAgentWorkflow(definition, { invoker });

    expect(result.status).toBe("failed");
    expect(result.failedStepId).toBe("critic");
    expect(result.finalOutput).toBe("Critic hard failure.");
    expect(result.metrics.failedSteps).toBe(1);
    expect(result.metrics.parallelGroups).toEqual(["analysis"]);
    expect(result.steps).toHaveLength(3);
    expect(invoker).toHaveBeenCalledTimes(3);
  });

  it("records warnings when template paths are missing", async () => {
    const invoker = jest
      .fn<Promise<AgentInvocationResponse>, [AgentInvocationRequest]>()
      .mockResolvedValue(
        makeResponse({
          requestId: "req-1",
          providerKey: "planner-agent",
          capability: "plan",
          output: "Done.",
        }),
      );

    const definition: AgentWorkflowDefinition = {
      workflowId: "wf-missing-values",
      initialInstruction: "Anything",
      sharedContext: {
        segment: "cash-flow",
      },
      steps: [
        {
          id: "planner",
          providerKey: "planner-agent",
          capability: "plan",
          instructionTemplate:
            "Use {{shared.segment}} and {{shared.missingKey}} values.",
        },
      ],
    };

    const result = await runAgentWorkflow(definition, { invoker });

    expect(result.status).toBe("success");
    expect(invoker.mock.calls[0]?.[0].instruction).toBe(
      "Use cash-flow and  values.",
    );
    expect(result.steps[0]?.warnings).toContain(
      "Missing workflow context value: shared.missingKey",
    );
  });
});
