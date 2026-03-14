import { useEffect, useMemo, useState } from "react";
import { Switch, View } from "react-native";

import { Pill } from "@/components/common/Pill";
import { PrimaryButton } from "@/components/common/PrimaryButton";
import { Screen } from "@/components/common/Screen";
import { SecondaryButton } from "@/components/common/SecondaryButton";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { TextField } from "@/components/common/TextField";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useErrorBanner } from "@/hooks/useErrorBanner";
import type { AgentCapability } from "@/utils/contracts/agents";
import {
  useClearAgentWorkflowHistory,
  useAgentInvocationHistory,
  useAgentWorkflowHistory,
  useInvokeAgent,
  useAgentProviders,
  useRunAgentWorkflow,
} from "@/utils/queries/useAgentInterop";

const CAPABILITY_OPTIONS: Array<{ label: string; value: AgentCapability }> = [
  { label: "Explain", value: "explain" },
  { label: "Summarize", value: "summarize" },
  { label: "Plan", value: "plan" },
] as const;

const DEFAULT_PROMPT =
  "Summarize the next three actions for this user's current financial maturity stage and explain tradeoffs.";

export default function AgentHubScreen(): JSX.Element {
  const { colors, tokens } = useAppTheme();
  const { showError, showSuccess } = useErrorBanner();
  const providersQuery = useAgentProviders();
  const invokeAgentMutation = useInvokeAgent();
  const runWorkflowMutation = useRunAgentWorkflow();
  const clearWorkflowHistoryMutation = useClearAgentWorkflowHistory();
  const historyQuery = useAgentInvocationHistory(8);
  const workflowHistoryQuery = useAgentWorkflowHistory(6);

  const [selectedProviderKey, setSelectedProviderKey] = useState("");
  const [capability, setCapability] = useState<AgentCapability>("explain");
  const [instruction, setInstruction] = useState(DEFAULT_PROMPT);
  const [dryRun, setDryRun] = useState(true);

  useEffect(() => {
    if (
      selectedProviderKey ||
      !providersQuery.data ||
      providersQuery.data.length === 0
    ) {
      return;
    }
    setSelectedProviderKey(providersQuery.data[0].providerKey);
  }, [providersQuery.data, selectedProviderKey]);

  const selectedProvider = useMemo(
    () =>
      providersQuery.data?.find(
        (provider) => provider.providerKey === selectedProviderKey,
      ),
    [providersQuery.data, selectedProviderKey],
  );

  const workflowProviders = useMemo(() => {
    if (!providersQuery.data || providersQuery.data.length === 0) {
      return null;
    }

    const fallbackProvider = providersQuery.data[0];
    const providerAt = (
      index: number,
    ): NonNullable<typeof providersQuery.data>[number] =>
      providersQuery.data[index] ?? fallbackProvider;
    return {
      planner: providerAt(0),
      riskSpecialist: providerAt(1),
      taxSpecialist: providerAt(2),
      critic: providerAt(3),
      summarizer: providerAt(4),
    };
  }, [providersQuery]);

  const canInvoke =
    selectedProviderKey.length > 0 && instruction.trim().length > 0;
  const canRunWorkflow =
    Boolean(workflowProviders) && instruction.trim().length > 0;
  const styles = {
    container: {
      gap: tokens.space.md,
      paddingBottom: tokens.space.xxl,
    },
    header: {
      gap: tokens.space.xs,
    },
    chipWrap: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: tokens.space.xs,
      marginTop: tokens.space.xs,
    },
    switchRow: {
      marginTop: tokens.space.sm,
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
    },
  };

  return (
    <Screen variant="scroll" contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text
          testID="agent-hub-screen-title"
          variant="headlineMedium"
          style={{ color: colors.text, fontWeight: "700" }}
        >
          Agent Hub
        </Text>
        <Text variant="bodyMedium" style={{ color: colors.textMuted }}>
          Compare connected agent providers and test prompts safely in dry-run
          mode.
        </Text>
      </View>

      <SurfaceCard testID="agent-hub-providers-section">
        <Text variant="labelMedium" style={{ color: colors.textFaint }}>
          PROVIDERS
        </Text>
        {providersQuery.isLoading ? (
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            Loading connected providers.
          </Text>
        ) : providersQuery.isError ? (
          <Text variant="bodySmall" style={{ color: colors.negative }}>
            We could not load providers right now.
          </Text>
        ) : providersQuery.data && providersQuery.data.length > 0 ? (
          <View style={styles.chipWrap}>
            {providersQuery.data.map((provider) => (
              <Pill
                key={provider.providerKey}
                active={provider.providerKey === selectedProviderKey}
                onPress={() => setSelectedProviderKey(provider.providerKey)}
                tone="accent"
                testID={`agent-provider-${provider.providerKey}`}
              >
                {provider.displayName}
              </Pill>
            ))}
          </View>
        ) : (
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            No providers are configured for this workspace yet.
          </Text>
        )}
      </SurfaceCard>

      <SurfaceCard testID="agent-hub-request-section">
        <Text variant="labelMedium" style={{ color: colors.textFaint }}>
          REQUEST
        </Text>
        <SegmentedControl
          value={capability}
          options={CAPABILITY_OPTIONS.map((option) => ({
            label: option.label,
            value: option.value,
          }))}
          onChange={(value) => setCapability(value as AgentCapability)}
        />
        <View style={{ marginTop: tokens.space.sm }}>
          <TextField
            label="Instruction"
            value={instruction}
            onChangeText={setInstruction}
            multiline
            numberOfLines={4}
          />
        </View>
        <View style={styles.switchRow}>
          <Text variant="bodyMedium" style={{ color: colors.textMuted }}>
            Dry run
          </Text>
          <Switch
            value={dryRun}
            onValueChange={setDryRun}
            trackColor={{ false: colors.borderStrong, true: colors.accentSoft }}
            thumbColor={dryRun ? colors.accent : colors.surface1}
            ios_backgroundColor={colors.borderStrong}
          />
        </View>
        <View style={{ marginTop: tokens.space.sm }}>
          <PrimaryButton
            disabled={!canInvoke || invokeAgentMutation.isPending}
            onPress={() => {
              if (!canInvoke) {
                showError("Select a provider and enter an instruction.");
                return;
              }

              invokeAgentMutation.mutate(
                {
                  providerKey: selectedProviderKey,
                  capability,
                  instruction: instruction.trim(),
                  context: {
                    source: "agent_hub",
                  },
                  dryRun,
                },
                {
                  onError: () => {
                    showError("We couldn't run that request. Try again.");
                  },
                },
              );
            }}
          >
            {invokeAgentMutation.isPending
              ? "Running request..."
              : "Run request"}
          </PrimaryButton>
        </View>
        <View style={{ marginTop: tokens.space.xs }}>
          <PrimaryButton
            disabled={!canRunWorkflow || runWorkflowMutation.isPending}
            onPress={() => {
              if (!workflowProviders || instruction.trim().length === 0) {
                showError(
                  "Enter an instruction and configure at least one provider.",
                );
                return;
              }

              runWorkflowMutation.mutate(
                {
                  workflowId: `agent_hub_${Date.now()}`,
                  initialInstruction: instruction.trim(),
                  sharedContext: {
                    source: "agent_hub",
                  },
                  dryRun,
                  steps: [
                    {
                      id: "planner",
                      providerKey: workflowProviders.planner.providerKey,
                      capability: "plan",
                      instructionTemplate:
                        "Build an action plan for this objective: {{initial_instruction}}",
                    },
                    {
                      id: "risk_specialist",
                      providerKey: workflowProviders.riskSpecialist.providerKey,
                      capability: "classify",
                      parallelGroup: "analysis",
                      instructionTemplate:
                        "Evaluate downside and execution risk for this plan: {{steps.planner.output}}",
                    },
                    {
                      id: "tax_specialist",
                      providerKey: workflowProviders.taxSpecialist.providerKey,
                      capability: "explain",
                      parallelGroup: "analysis",
                      instructionTemplate:
                        "Identify tax-sensitive implications and assumptions in this plan: {{steps.planner.output}}",
                    },
                    {
                      id: "critic",
                      providerKey: workflowProviders.critic.providerKey,
                      capability: "explain",
                      required: false,
                      parallelGroup: "analysis",
                      instructionTemplate:
                        "Critique this draft plan and call out risk: {{steps.planner.output}}",
                    },
                    {
                      id: "summarizer",
                      providerKey: workflowProviders.summarizer.providerKey,
                      capability: "summarize",
                      instructionTemplate:
                        "Produce final recommendation options using the plan {{steps.planner.output}}, risk analysis {{steps.risk_specialist.output}}, tax analysis {{steps.tax_specialist.output}}, and critique {{steps.critic.output}}.",
                    },
                  ],
                },
                {
                  onError: () => {
                    showError("We couldn't run that workflow. Try again.");
                  },
                },
              );
            }}
          >
            {runWorkflowMutation.isPending
              ? "Running workflow..."
              : "Run multi-step workflow"}
          </PrimaryButton>
        </View>
      </SurfaceCard>

      {invokeAgentMutation.data ? (
        <SurfaceCard testID="agent-hub-request-result-section">
          <Text variant="labelMedium" style={{ color: colors.textFaint }}>
            REQUEST RESULT
          </Text>
          <Text variant="titleSmall" style={{ color: colors.text }}>
            {`${invokeAgentMutation.data.status} · ${invokeAgentMutation.data.latencyMs}ms`}
          </Text>
          <Text variant="bodyMedium" style={{ color: colors.textMuted }}>
            {invokeAgentMutation.data.output}
          </Text>
          {invokeAgentMutation.data.warnings &&
          invokeAgentMutation.data.warnings.length > 0 ? (
            <View style={{ marginTop: tokens.space.xs, gap: tokens.space.xs }}>
              {invokeAgentMutation.data.warnings.map((warning) => (
                <Text
                  key={warning}
                  variant="bodySmall"
                  style={{ color: colors.warning }}
                >
                  {warning}
                </Text>
              ))}
            </View>
          ) : null}
        </SurfaceCard>
      ) : null}

      {runWorkflowMutation.data ? (
        <SurfaceCard testID="agent-hub-workflow-result-section">
          <Text variant="labelMedium" style={{ color: colors.textFaint }}>
            WORKFLOW RESULT
          </Text>
          <Text variant="titleSmall" style={{ color: colors.text }}>
            {runWorkflowMutation.data.status}
          </Text>
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            {`${runWorkflowMutation.data.metrics.successfulSteps}/${runWorkflowMutation.data.metrics.totalSteps} steps successful · ${runWorkflowMutation.data.metrics.optionalFailures} optional failures · ${runWorkflowMutation.data.durationMs}ms`}
          </Text>
          {runWorkflowMutation.data.metrics.parallelGroups.length > 0 ? (
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              {`Parallel groups: ${runWorkflowMutation.data.metrics.parallelGroups.join(", ")}`}
            </Text>
          ) : null}
          <Text variant="bodyMedium" style={{ color: colors.textMuted }}>
            {runWorkflowMutation.data.finalOutput}
          </Text>
          <View style={{ marginTop: tokens.space.xs, gap: tokens.space.xs }}>
            {runWorkflowMutation.data.steps.map((step) => (
              <View key={step.stepId} style={{ gap: tokens.space.xs }}>
                <Text variant="bodySmall" style={{ color: colors.text }}>
                  {`${step.stepId} · ${step.providerKey} · ${step.status} · ${step.required ? "required" : "optional"}`}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                  {`${step.parallelGroup ?? "serial"} · ${new Date(step.completedAt).toLocaleTimeString()}`}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                  {step.output}
                </Text>
                {step.warnings.length > 0 ? (
                  <Text variant="bodySmall" style={{ color: colors.warning }}>
                    {step.warnings.join(" | ")}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        </SurfaceCard>
      ) : null}

      {selectedProvider ? (
        <SurfaceCard testID="agent-hub-provider-details-section">
          <Text variant="labelMedium" style={{ color: colors.textFaint }}>
            PROVIDER DETAILS
          </Text>
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            {`Key: ${selectedProvider.providerKey}`}
          </Text>
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            {`Auth: ${selectedProvider.authType}`}
          </Text>
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            {`Protocol: ${selectedProvider.protocol}`}
          </Text>
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            {`Capabilities: ${selectedProvider.capabilities.join(", ") || "none"}`}
          </Text>
        </SurfaceCard>
      ) : null}

      <SurfaceCard testID="agent-hub-recent-invocations-section">
        <Text variant="labelMedium" style={{ color: colors.textFaint }}>
          RECENT INVOCATIONS
        </Text>
        {historyQuery.isLoading ? (
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            Loading invocation history.
          </Text>
        ) : historyQuery.isError ? (
          <Text variant="bodySmall" style={{ color: colors.negative }}>
            We could not load invocation history.
          </Text>
        ) : historyQuery.data && historyQuery.data.length > 0 ? (
          <View style={{ gap: tokens.space.xs, marginTop: tokens.space.xs }}>
            {historyQuery.data.map((entry) => (
              <View key={entry.id} style={{ gap: tokens.space.xs }}>
                <Text variant="titleSmall" style={{ color: colors.text }}>
                  {`${entry.providerKey} · ${entry.capability}`}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                  {`${entry.status} · ${
                    entry.latencyMs !== null ? `${entry.latencyMs}ms` : "n/a"
                  } · ${new Date(entry.createdAt).toLocaleString()}`}
                </Text>
                {entry.errorMessage ? (
                  <Text variant="bodySmall" style={{ color: colors.warning }}>
                    {entry.errorMessage}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            No agent invocations yet.
          </Text>
        )}
      </SurfaceCard>

      <SurfaceCard testID="agent-hub-recent-workflows-section">
        <Text variant="labelMedium" style={{ color: colors.textFaint }}>
          RECENT WORKFLOWS
        </Text>
        <View style={{ marginTop: tokens.space.xs }}>
          <SecondaryButton
            disabled={
              clearWorkflowHistoryMutation.isPending ||
              !workflowHistoryQuery.data ||
              workflowHistoryQuery.data.length === 0
            }
            onPress={() => {
              clearWorkflowHistoryMutation.mutate(undefined, {
                onSuccess: () => {
                  showSuccess("Workflow history cleared.");
                },
                onError: () => {
                  showError("We couldn't clear workflow history.");
                },
              });
            }}
          >
            {clearWorkflowHistoryMutation.isPending
              ? "Clearing history..."
              : "Clear workflow history"}
          </SecondaryButton>
        </View>
        {workflowHistoryQuery.data && workflowHistoryQuery.data.length > 0 ? (
          <View style={{ gap: tokens.space.xs, marginTop: tokens.space.xs }}>
            {workflowHistoryQuery.data.map((entry) => (
              <View
                key={`${entry.workflowId}-${entry.recordedAt}`}
                style={{ gap: tokens.space.xs }}
              >
                <Text variant="titleSmall" style={{ color: colors.text }}>
                  {`${entry.workflowId} · ${entry.status}`}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                  {`${entry.metrics.successfulSteps}/${entry.metrics.totalSteps} steps · ${entry.durationMs}ms · ${new Date(entry.recordedAt).toLocaleString()}`}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                  {entry.finalOutput}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            No workflow runs yet.
          </Text>
        )}
      </SurfaceCard>
    </Screen>
  );
}
