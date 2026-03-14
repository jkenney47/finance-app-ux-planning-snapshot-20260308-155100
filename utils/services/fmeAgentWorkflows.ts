import type {
  AgentCapability,
  AgentWorkflowDefinition,
} from "@/utils/contracts/agents";
import type { FmeEvaluation } from "@/utils/contracts/fme";

const DEFAULT_PROVIDER_KEY = "mock_agent_bridge";

function parseFlag(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

function providerKeyFromEnv(rawValue: string | undefined): string {
  const normalized = rawValue?.trim();
  return normalized && normalized.length > 0
    ? normalized
    : DEFAULT_PROVIDER_KEY;
}

function capabilityFromEnv(
  rawValue: string | undefined,
  fallback: AgentCapability,
): AgentCapability {
  const normalized = rawValue?.trim().toLowerCase();
  if (
    normalized === "explain" ||
    normalized === "summarize" ||
    normalized === "plan" ||
    normalized === "classify" ||
    normalized === "extract" ||
    normalized === "custom"
  ) {
    return normalized;
  }
  return fallback;
}

export function isFmeAgentExplanationEnabled(
  rawValue = process.env.EXPO_PUBLIC_ENABLE_AGENT_EXPLANATIONS,
): boolean {
  return parseFlag(rawValue);
}

export function isPolicyIngestionAgentEnabled(
  rawValue = process.env.EXPO_PUBLIC_ENABLE_POLICY_INGESTION_AGENT,
): boolean {
  return parseFlag(rawValue);
}

export function buildFmeExplanationWorkflow(
  evaluation: FmeEvaluation,
  overrides?: {
    providerKey?: string;
    capability?: AgentCapability;
  },
): AgentWorkflowDefinition {
  const providerKey =
    overrides?.providerKey ??
    providerKeyFromEnv(process.env.EXPO_PUBLIC_FME_EXPLAIN_PROVIDER_KEY);
  const summarizeCapability =
    overrides?.capability ??
    capabilityFromEnv(
      process.env.EXPO_PUBLIC_FME_EXPLAIN_CAPABILITY,
      "summarize",
    );

  return {
    workflowId: `fme_explanation_${Date.now()}`,
    initialInstruction:
      "Translate this financial maturity result into a concise explanation with options and tradeoffs.",
    dryRun: true,
    sharedContext: {
      mode: evaluation.mode,
      generatedAt: evaluation.generatedAt,
      primaryRecommendation: evaluation.primaryRecommendation,
      alternatives: evaluation.alternatives,
      trace: evaluation.trace,
    },
    steps: [
      {
        id: "trace_reader",
        providerKey,
        capability: "extract",
        instructionTemplate:
          "Extract the top decision facts and policy references from this trace: {{shared.trace}}",
      },
      {
        id: "explanation_writer",
        providerKey,
        capability: summarizeCapability,
        instructionTemplate:
          "Using mode {{shared.mode}}, primary recommendation {{shared.primaryRecommendation}}, alternatives {{shared.alternatives}}, and extracted trace notes {{steps.trace_reader.output}}, produce plain-language options with pros and cons.",
      },
    ],
  };
}

export function buildPolicyIngestionReviewWorkflow(
  input: {
    domain: string;
    sourceLabel: string;
    rawPayload: Record<string, unknown>;
    proposedPack: Record<string, unknown>;
  },
  options?: { providerKey?: string },
): AgentWorkflowDefinition {
  const providerKey =
    options?.providerKey ??
    providerKeyFromEnv(process.env.EXPO_PUBLIC_POLICY_INGEST_PROVIDER_KEY);

  return {
    workflowId: `policy_review_${input.domain}_${Date.now()}`,
    initialInstruction:
      "Review a proposed policy pack and call out schema or policy mismatches.",
    dryRun: true,
    sharedContext: {
      domain: input.domain,
      sourceLabel: input.sourceLabel,
      rawPayload: input.rawPayload,
      proposedPack: input.proposedPack,
    },
    steps: [
      {
        id: "schema_guard",
        providerKey,
        capability: "classify",
        instructionTemplate:
          "Classify whether this proposed {{shared.domain}} pack is consistent with the source {{shared.sourceLabel}}. Source payload: {{shared.rawPayload}}. Proposed pack: {{shared.proposedPack}}",
      },
      {
        id: "review_summary",
        providerKey,
        capability: "explain",
        instructionTemplate:
          "Summarize validation risks and required corrections from this classification output: {{steps.schema_guard.output}}",
      },
    ],
  };
}
