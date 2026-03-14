import {
  buildFmeExplanationWorkflow,
  buildPolicyIngestionReviewWorkflow,
  isFmeAgentExplanationEnabled,
  isPolicyIngestionAgentEnabled,
} from "@/utils/services/fmeAgentWorkflows";
import { evaluateFinancialMaturity } from "@/utils/domain/fme/engine";
import { makeFact } from "@/utils/contracts/facts";

describe("fme agent workflows", () => {
  const originalExplainFlag = process.env.EXPO_PUBLIC_ENABLE_AGENT_EXPLANATIONS;
  const originalPolicyFlag =
    process.env.EXPO_PUBLIC_ENABLE_POLICY_INGESTION_AGENT;

  afterEach(() => {
    if (originalExplainFlag === undefined) {
      delete process.env.EXPO_PUBLIC_ENABLE_AGENT_EXPLANATIONS;
    } else {
      process.env.EXPO_PUBLIC_ENABLE_AGENT_EXPLANATIONS = originalExplainFlag;
    }

    if (originalPolicyFlag === undefined) {
      delete process.env.EXPO_PUBLIC_ENABLE_POLICY_INGESTION_AGENT;
    } else {
      process.env.EXPO_PUBLIC_ENABLE_POLICY_INGESTION_AGENT =
        originalPolicyFlag;
    }
  });

  describe("feature flags", () => {
    describe("isFmeAgentExplanationEnabled", () => {
      it("returns true for 'true' variations", () => {
        expect(isFmeAgentExplanationEnabled("true")).toBe(true);
        expect(isFmeAgentExplanationEnabled("TRUE")).toBe(true);
        expect(isFmeAgentExplanationEnabled(" true ")).toBe(true);
      });

      it("returns false for non-true values", () => {
        expect(isFmeAgentExplanationEnabled("false")).toBe(false);
        expect(isFmeAgentExplanationEnabled("")).toBe(false);
        delete process.env.EXPO_PUBLIC_ENABLE_AGENT_EXPLANATIONS;
        expect(isFmeAgentExplanationEnabled(undefined)).toBe(false);
        expect(isFmeAgentExplanationEnabled("something")).toBe(false);
      });
    });

    describe("isPolicyIngestionAgentEnabled", () => {
      it("returns true for 'true' variations", () => {
        expect(isPolicyIngestionAgentEnabled("true")).toBe(true);
        expect(isPolicyIngestionAgentEnabled("TRUE")).toBe(true);
        expect(isPolicyIngestionAgentEnabled(" true ")).toBe(true);
      });

      it("returns false for non-true values", () => {
        expect(isPolicyIngestionAgentEnabled("false")).toBe(false);
        expect(isPolicyIngestionAgentEnabled("")).toBe(false);
        delete process.env.EXPO_PUBLIC_ENABLE_POLICY_INGESTION_AGENT;
        expect(isPolicyIngestionAgentEnabled(undefined)).toBe(false);
        expect(isPolicyIngestionAgentEnabled("something")).toBe(false);
      });
    });
  });

  it("builds an explanation workflow with default provider fallback", () => {
    const evaluation = evaluateFinancialMaturity({
      facts: {
        hasLinkedAccounts: makeFact("hasLinkedAccounts", true, "manual"),
      },
    });

    const workflow = buildFmeExplanationWorkflow(evaluation, {
      providerKey: "mock_agent_bridge",
    });
    expect(workflow.dryRun).toBe(true);
    expect(workflow.steps[0]?.providerKey).toBe("mock_agent_bridge");
    expect(workflow.steps[0]?.id).toBe("trace_reader");
    expect(workflow.steps[1]?.id).toBe("explanation_writer");
  });

  it("builds policy ingestion review workflow", () => {
    const workflow = buildPolicyIngestionReviewWorkflow({
      domain: "thresholds",
      sourceLabel: "FRED CPI",
      rawPayload: { yoyInflation: 0.03 },
      proposedPack: { starterFundFloor: 2600 },
    });

    expect(workflow.dryRun).toBe(true);
    expect(workflow.workflowId).toMatch(/^policy_review_thresholds_\d+$/);
    expect(workflow.initialInstruction).toBe(
      "Review a proposed policy pack and call out schema or policy mismatches.",
    );
    expect(workflow.sharedContext).toEqual({
      domain: "thresholds",
      sourceLabel: "FRED CPI",
      rawPayload: { yoyInflation: 0.03 },
      proposedPack: { starterFundFloor: 2600 },
    });
    expect(workflow.steps).toHaveLength(2);
    expect(workflow.steps[0]?.id).toBe("schema_guard");
    expect(workflow.steps[0]?.capability).toBe("classify");
    expect(workflow.steps[0]?.providerKey).toBe("mock_agent_bridge");
    expect(workflow.steps[1]?.id).toBe("review_summary");
    expect(workflow.steps[1]?.capability).toBe("explain");
    expect(workflow.steps[1]?.providerKey).toBe("mock_agent_bridge");
  });

  it("builds policy ingestion review workflow with custom providerKey", () => {
    const workflow = buildPolicyIngestionReviewWorkflow(
      { domain: "test", sourceLabel: "test", rawPayload: {}, proposedPack: {} },
      { providerKey: "custom_key" },
    );
    expect(workflow.steps[0]?.providerKey).toBe("custom_key");
  });
});
