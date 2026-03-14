import type {
  AgentInvocationRequest,
  AgentInvocationResponse,
  AgentInvocationStatus,
  AgentWorkflowDefinition,
  AgentWorkflowMetrics,
  AgentWorkflowResult,
  AgentWorkflowStepResult,
} from "@/utils/contracts/agents";

import { invokeAgent } from "@/utils/services/agentInteropClient";

type AgentInvoker = (
  request: AgentInvocationRequest,
) => Promise<AgentInvocationResponse>;

type RunAgentWorkflowOptions = {
  invoker?: AgentInvoker;
};

type WorkflowContext = {
  initial_instruction: string;
  previous_output: string;
  shared: Record<string, unknown>;
  steps: Record<
    string,
    {
      providerKey: string;
      capability: string;
      status: AgentInvocationStatus;
      output: string;
      warnings: string[];
    }
  >;
};

function getPathValue(source: unknown, path: string): unknown {
  return path
    .split(".")
    .filter(Boolean)
    .reduce<unknown>((current, segment) => {
      if (current === undefined || current === null) return undefined;
      if (Array.isArray(current)) {
        const index = Number(segment);
        return Number.isInteger(index) ? current[index] : undefined;
      }
      if (typeof current === "object") {
        const record = current as Record<string, unknown>;
        return record[segment];
      }
      return undefined;
    }, source);
}

function toTemplateValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function renderInstructionTemplate(
  template: string,
  context: WorkflowContext,
): { instruction: string; warnings: string[] } {
  const missingPaths = new Set<string>();
  const instruction = template.replace(
    /{{\s*([^}]+?)\s*}}/g,
    (_match: string, rawPath: string) => {
      const path = rawPath.trim();
      const value = getPathValue(context, path);
      if (value === undefined) {
        missingPaths.add(path);
        return "";
      }
      return toTemplateValue(value);
    },
  );

  return {
    instruction: instruction.trim(),
    warnings: Array.from(missingPaths).map(
      (path) => `Missing workflow context value: ${path}`,
    ),
  };
}

function isFailureStatus(status: AgentInvocationStatus): boolean {
  return status === "failed" || status === "provider_unavailable";
}

function mergeWarnings(
  ...warningGroups: Array<string[] | undefined>
): string[] {
  return Array.from(
    new Set(warningGroups.flatMap((group) => group ?? []).filter(Boolean)),
  );
}

function pickLatestSuccessfulOutput(
  stepResults: AgentWorkflowStepResult[],
): string | null {
  for (let index = stepResults.length - 1; index >= 0; index -= 1) {
    const candidate = stepResults[index];
    if (!candidate || isFailureStatus(candidate.status)) {
      continue;
    }
    if (candidate.output.length > 0) {
      return candidate.output;
    }
  }
  return null;
}

function collectParallelGroups(definition: AgentWorkflowDefinition): string[] {
  return Array.from(
    new Set(
      definition.steps
        .map((step) => step.parallelGroup)
        .filter((group): group is string => typeof group === "string"),
    ),
  );
}

function buildWorkflowMetrics(
  definition: AgentWorkflowDefinition,
  stepResults: AgentWorkflowStepResult[],
): AgentWorkflowMetrics {
  const successfulSteps = stepResults.filter(
    (step) => !isFailureStatus(step.status),
  ).length;
  const failedSteps = stepResults.length - successfulSteps;
  const optionalFailures = stepResults.filter(
    (step) => isFailureStatus(step.status) && !step.required,
  ).length;

  return {
    totalSteps: definition.steps.length,
    successfulSteps,
    failedSteps,
    optionalFailures,
    totalLatencyMs: stepResults.reduce(
      (sum, step) => sum + Math.max(0, step.latencyMs),
      0,
    ),
    parallelGroups: collectParallelGroups(definition),
  };
}

function finalizeWorkflowResult(input: {
  definition: AgentWorkflowDefinition;
  status: AgentWorkflowResult["status"];
  finalOutput: string;
  failedStepId?: string;
  stepResults: AgentWorkflowStepResult[];
  startedAtMs: number;
}): AgentWorkflowResult {
  const completedAtMs = Date.now();
  return {
    workflowId: input.definition.workflowId,
    status: input.status,
    finalOutput: input.finalOutput,
    failedStepId: input.failedStepId,
    startedAt: new Date(input.startedAtMs).toISOString(),
    completedAt: new Date(completedAtMs).toISOString(),
    durationMs: Math.max(0, completedAtMs - input.startedAtMs),
    metrics: buildWorkflowMetrics(input.definition, input.stepResults),
    steps: input.stepResults,
  };
}

export async function runAgentWorkflow(
  definition: AgentWorkflowDefinition,
  options: RunAgentWorkflowOptions = {},
): Promise<AgentWorkflowResult> {
  const invoker = options.invoker ?? invokeAgent;
  const workflowStartedAtMs = Date.now();

  if (definition.steps.length === 0) {
    return finalizeWorkflowResult({
      definition,
      status: "failed",
      finalOutput: "Workflow has no steps.",
      failedStepId: "no_steps",
      stepResults: [],
      startedAtMs: workflowStartedAtMs,
    });
  }

  const stepState: WorkflowContext["steps"] = {};
  const stepResults: AgentWorkflowStepResult[] = [];
  const sharedContext = definition.sharedContext ?? {};
  let previousOutput = "";
  let hadOptionalFailure = false;
  let stepIndex = 0;

  while (stepIndex < definition.steps.length) {
    const step = definition.steps[stepIndex];
    if (!step) {
      stepIndex += 1;
      continue;
    }

    const isParallel = typeof step.parallelGroup === "string";

    if (!isParallel) {
      const rendered = renderInstructionTemplate(step.instructionTemplate, {
        initial_instruction: definition.initialInstruction,
        previous_output: previousOutput,
        shared: sharedContext,
        steps: stepState,
      });
      const startedAtMs = Date.now();

      const response = await invoker({
        providerKey: step.providerKey,
        capability: step.capability,
        instruction:
          rendered.instruction.length > 0
            ? rendered.instruction
            : definition.initialInstruction,
        context: {
          ...sharedContext,
          workflowId: definition.workflowId,
          stepId: step.id,
          previousOutput,
          steps: stepState,
        },
        dryRun: step.dryRun ?? definition.dryRun,
      });
      const completedAtMs = Date.now();

      const warnings = mergeWarnings(rendered.warnings, response.warnings);
      const stepResult: AgentWorkflowStepResult = {
        stepId: step.id,
        providerKey: step.providerKey,
        capability: step.capability,
        parallelGroup: step.parallelGroup,
        required: step.required !== false,
        status: response.status,
        output: response.output,
        latencyMs: response.latencyMs,
        startedAt: new Date(startedAtMs).toISOString(),
        completedAt: new Date(completedAtMs).toISOString(),
        warnings,
      };

      stepResults.push(stepResult);
      stepState[step.id] = {
        providerKey: stepResult.providerKey,
        capability: stepResult.capability,
        status: stepResult.status,
        output: stepResult.output,
        warnings: stepResult.warnings,
      };

      if (isFailureStatus(response.status)) {
        if (step.required === false) {
          hadOptionalFailure = true;
          stepIndex += 1;
          continue;
        }
        return finalizeWorkflowResult({
          definition,
          status: "failed",
          finalOutput: stepResult.output,
          failedStepId: step.id,
          stepResults,
          startedAtMs: workflowStartedAtMs,
        });
      }

      previousOutput = stepResult.output;
      stepIndex += 1;
      continue;
    }

    const parallelGroup = step.parallelGroup!;
    const groupSteps = [step];
    stepIndex += 1;
    while (
      stepIndex < definition.steps.length &&
      definition.steps[stepIndex]?.parallelGroup === parallelGroup
    ) {
      const groupedStep = definition.steps[stepIndex];
      if (groupedStep) {
        groupSteps.push(groupedStep);
      }
      stepIndex += 1;
    }

    const renderedGroup = groupSteps.map((groupedStep) => {
      const rendered = renderInstructionTemplate(
        groupedStep.instructionTemplate,
        {
          initial_instruction: definition.initialInstruction,
          previous_output: previousOutput,
          shared: sharedContext,
          steps: stepState,
        },
      );

      return {
        step: groupedStep,
        rendered,
      };
    });

    const responses = await Promise.all(
      renderedGroup.map(async ({ step: groupedStep, rendered }) => {
        const startedAtMs = Date.now();
        const response = await invoker({
          providerKey: groupedStep.providerKey,
          capability: groupedStep.capability,
          instruction:
            rendered.instruction.length > 0
              ? rendered.instruction
              : definition.initialInstruction,
          context: {
            ...sharedContext,
            workflowId: definition.workflowId,
            stepId: groupedStep.id,
            parallelGroup,
            previousOutput,
            steps: stepState,
          },
          dryRun: groupedStep.dryRun ?? definition.dryRun,
        });
        const completedAtMs = Date.now();
        return {
          response,
          startedAt: new Date(startedAtMs).toISOString(),
          completedAt: new Date(completedAtMs).toISOString(),
        };
      }),
    );

    let firstRequiredFailure:
      | {
          stepId: string;
          output: string;
        }
      | undefined;
    const parallelResults: AgentWorkflowStepResult[] = [];

    for (let index = 0; index < renderedGroup.length; index += 1) {
      const groupedStep = renderedGroup[index]?.step;
      const rendered = renderedGroup[index]?.rendered;
      const invocationResult = responses[index];
      const response = invocationResult?.response;

      if (!groupedStep || !rendered || !response || !invocationResult) {
        continue;
      }

      const warnings = mergeWarnings(rendered.warnings, response.warnings);
      const stepResult: AgentWorkflowStepResult = {
        stepId: groupedStep.id,
        providerKey: groupedStep.providerKey,
        capability: groupedStep.capability,
        parallelGroup,
        required: groupedStep.required !== false,
        status: response.status,
        output: response.output,
        latencyMs: response.latencyMs,
        startedAt: invocationResult.startedAt,
        completedAt: invocationResult.completedAt,
        warnings,
      };

      stepResults.push(stepResult);
      parallelResults.push(stepResult);
      stepState[groupedStep.id] = {
        providerKey: stepResult.providerKey,
        capability: stepResult.capability,
        status: stepResult.status,
        output: stepResult.output,
        warnings: stepResult.warnings,
      };

      if (isFailureStatus(response.status)) {
        if (groupedStep.required === false) {
          hadOptionalFailure = true;
          continue;
        }
        if (!firstRequiredFailure) {
          firstRequiredFailure = {
            stepId: groupedStep.id,
            output: stepResult.output,
          };
        }
      }
    }

    if (firstRequiredFailure) {
      return finalizeWorkflowResult({
        definition,
        status: "failed",
        finalOutput: firstRequiredFailure.output,
        failedStepId: firstRequiredFailure.stepId,
        stepResults,
        startedAtMs: workflowStartedAtMs,
      });
    }

    const latestSuccessfulOutput = pickLatestSuccessfulOutput(parallelResults);
    if (latestSuccessfulOutput) {
      previousOutput = latestSuccessfulOutput;
    }
  }

  const fallbackOutput =
    stepResults.length > 0 ? stepResults[stepResults.length - 1].output : "";

  return finalizeWorkflowResult({
    definition,
    status: hadOptionalFailure ? "partial_success" : "success",
    finalOutput: previousOutput || fallbackOutput,
    stepResults,
    startedAtMs: workflowStartedAtMs,
  });
}
