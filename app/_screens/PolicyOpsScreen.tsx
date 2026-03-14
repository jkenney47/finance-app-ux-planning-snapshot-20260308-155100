import { useMemo, useState } from "react";
import { View } from "react-native";

import { PrimaryButton } from "@/components/common/PrimaryButton";
import { Screen } from "@/components/common/Screen";
import { SecondaryButton } from "@/components/common/SecondaryButton";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { TextField } from "@/components/common/TextField";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useErrorBanner } from "@/hooks/useErrorBanner";
import { trackEvent } from "@/utils/analytics";
import { type PolicyDomain } from "@/utils/contracts/policy";
import { useRunAgentWorkflow } from "@/utils/queries/useAgentInterop";
import { backendClient } from "@/utils/services/backendClient";
import {
  parseBackendError,
  withRequestId,
} from "@/utils/services/backendErrors";
import { usePolicyOpsAuthProbe } from "@/utils/queries/usePolicyOpsAuthProbe";
import { usePolicyOpsAdmins } from "@/utils/queries/usePolicyOpsAdmins";
import { usePolicyGovernance } from "@/utils/queries/usePolicyGovernance";
import { usePolicyOpsAudits } from "@/utils/queries/usePolicyOpsAudits";
import { usePolicyBundle } from "@/utils/queries/usePolicyBundle";
import {
  buildPolicyIngestionReviewWorkflow,
  isPolicyIngestionAgentEnabled,
} from "@/utils/services/fmeAgentWorkflows";

type RefreshResponse = {
  status?: string;
  version?: number;
  effectiveFrom?: string;
  publishMode?: "draft" | "approved";
  rates?: Record<string, unknown>;
  thresholds?: Record<string, unknown>;
  request_id?: string;
};

type GovernanceActionResponse = {
  status?: string;
  version?: number;
  copiedFromVersion?: number;
  effectiveFrom?: string;
  request_id?: string;
};

type AdminStatusResponse = {
  status?: string;
  request_id?: string;
  admin?: {
    user_id: string;
    active: boolean;
  };
};

type OperationState = {
  timestamp: string;
  title: string;
  detail: string;
  kind: "success" | "error";
};

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export default function PolicyOpsScreen(): JSX.Element {
  const { colors, tokens } = useAppTheme();
  const { showError, showSuccess } = useErrorBanner();
  const policyBundleQuery = usePolicyBundle();
  const governanceQuery = usePolicyGovernance();
  const auditsQuery = usePolicyOpsAudits(25);
  const authProbeQuery = usePolicyOpsAuthProbe();
  const adminsQuery = usePolicyOpsAdmins(50, authProbeQuery.data?.authorized);
  const runAgentWorkflowMutation = useRunAgentWorkflow();
  const [isRefreshingRates, setIsRefreshingRates] = useState(false);
  const [isStagingRates, setIsStagingRates] = useState(false);
  const [isRefreshingThresholds, setIsRefreshingThresholds] = useState(false);
  const [isStagingThresholds, setIsStagingThresholds] = useState(false);
  const [approvingByDomain, setApprovingByDomain] = useState<
    Partial<Record<PolicyDomain, boolean>>
  >({});
  const [rollingBackByDomain, setRollingBackByDomain] = useState<
    Partial<Record<PolicyDomain, boolean>>
  >({});
  const [reviewingByDomain, setReviewingByDomain] = useState<
    Partial<Record<PolicyDomain, boolean>>
  >({});
  const [latestReviewByDomain, setLatestReviewByDomain] = useState<
    Partial<Record<PolicyDomain, string>>
  >({});
  const [lastRatesResponse, setLastRatesResponse] =
    useState<RefreshResponse | null>(null);
  const [lastThresholdsResponse, setLastThresholdsResponse] =
    useState<RefreshResponse | null>(null);
  const [adminUserIdInput, setAdminUserIdInput] = useState("");
  const [adminNotesInput, setAdminNotesInput] = useState("");
  const [isSubmittingAdminUser, setIsSubmittingAdminUser] = useState(false);
  const [isRefreshingPanels, setIsRefreshingPanels] = useState(false);
  const [lastOperation, setLastOperation] = useState<OperationState | null>(
    null,
  );
  const [updatingAdminByUser, setUpdatingAdminByUser] = useState<
    Record<string, boolean>
  >({});
  const policyIngestionAgentEnabled = isPolicyIngestionAgentEnabled();

  const policyDomains = Object.values(policyBundleQuery.data?.domains ?? {});
  const governanceSnapshots = useMemo(
    () => governanceQuery.data?.snapshots ?? [],
    [governanceQuery.data?.snapshots],
  );
  const governancePacks = useMemo(
    () => governanceQuery.data?.packs ?? [],
    [governanceQuery.data?.packs],
  );
  const canMutatePolicy = authProbeQuery.data?.authorized ?? false;
  const styles = {
    container: {
      gap: tokens.space.md,
      paddingBottom: tokens.space.xxl,
    },
    header: {
      gap: tokens.space.xs,
    },
    row: {
      gap: tokens.space.xs,
      marginTop: tokens.space.xs,
    },
  };

  const recordOperation = (
    kind: OperationState["kind"],
    title: string,
    detail: string,
  ): void => {
    setLastOperation({
      kind,
      title,
      detail,
      timestamp: new Date().toISOString(),
    });
  };

  const refreshOperationalPanels = async (): Promise<void> => {
    setIsRefreshingPanels(true);
    try {
      await Promise.all([
        policyBundleQuery.refetch(),
        governanceQuery.refetch(),
        auditsQuery.refetch(),
        authProbeQuery.refetch(),
        adminsQuery.refetch(),
      ]);
      showSuccess("Policy operations panels refreshed.");
      recordOperation(
        "success",
        "Panels refreshed",
        "All ops queries updated.",
      );
      trackEvent("policy_ops_refresh_panels_success");
    } catch (error) {
      const parsedError = parseBackendError(
        error,
        "We couldn't refresh ops data.",
      );
      const message = withRequestId(parsedError.message, parsedError.requestId);
      showError(message);
      recordOperation("error", "Refresh failed", message);
      trackEvent(
        "policy_ops_refresh_panels_failure",
        { message: parsedError.message, requestId: parsedError.requestId },
        { level: "error" },
      );
    } finally {
      setIsRefreshingPanels(false);
    }
  };

  const runPolicyRefresh = async (
    domain: "rates" | "thresholds",
    options: { dryRun: boolean; publishMode?: "draft" | "approved" },
  ): Promise<void> => {
    const endpoint =
      domain === "rates" ? "/refreshRatesPolicy" : "/refreshThresholdsPolicy";
    const setResponse =
      domain === "rates" ? setLastRatesResponse : setLastThresholdsResponse;
    const isDryRun = options.dryRun;

    if (domain === "rates") {
      if (isDryRun) {
        setIsRefreshingRates(true);
      } else {
        setIsStagingRates(true);
      }
    } else if (isDryRun) {
      setIsRefreshingThresholds(true);
    } else {
      setIsStagingThresholds(true);
    }

    try {
      const response = await backendClient.post<RefreshResponse>(endpoint, {
        region: "US",
        jurisdiction: "federal",
        dryRun: isDryRun,
        publishMode: options.publishMode,
      });
      if (isDryRun) {
        setResponse(response);
        showSuccess(`${domain} dry-run refresh completed.`);
        recordOperation(
          "success",
          `${domain} dry-run refresh`,
          withRequestId(
            `Dry-run completed with publish mode ${
              response.publishMode ?? "unknown"
            }.`,
            response.request_id ?? null,
          ),
        );
        trackEvent("policy_ops_refresh_dry_run_success", {
          domain,
          publishMode: response.publishMode ?? "unknown",
          requestId: response.request_id ?? null,
        });
      } else {
        showSuccess(
          `${domain} draft policy pack staged (v${response.version}).`,
        );
        recordOperation(
          "success",
          `${domain} draft staged`,
          withRequestId(
            `Draft staged at version ${response.version ?? "unknown"}.`,
            response.request_id ?? null,
          ),
        );
        trackEvent("policy_ops_stage_draft_success", {
          domain,
          version: response.version ?? null,
          requestId: response.request_id ?? null,
        });
        await Promise.all([
          policyBundleQuery.refetch(),
          governanceQuery.refetch(),
          auditsQuery.refetch(),
        ]);
      }
    } catch (error) {
      const parsedError = parseBackendError(error, `${domain} refresh failed.`);
      const message = withRequestId(parsedError.message, parsedError.requestId);
      showError(`${domain} policy action failed: ${message}`);
      recordOperation("error", `${domain} refresh failed`, message);
      trackEvent(
        "policy_ops_refresh_failure",
        {
          domain,
          message: parsedError.message,
          requestId: parsedError.requestId,
        },
        { level: "error" },
      );
    } finally {
      if (domain === "rates") {
        if (isDryRun) {
          setIsRefreshingRates(false);
        } else {
          setIsStagingRates(false);
        }
      } else if (isDryRun) {
        setIsRefreshingThresholds(false);
      } else {
        setIsStagingThresholds(false);
      }
    }
  };

  const approveLatestDraft = async (domain: PolicyDomain): Promise<void> => {
    setApprovingByDomain((current) => ({ ...current, [domain]: true }));
    try {
      const response = await backendClient.post<GovernanceActionResponse>(
        "/governPolicyPacks",
        {
          action: "approve_latest_draft",
          domain,
          region: "US",
          jurisdiction: "federal",
        },
      );
      showSuccess(`${domain} draft approved as v${response.version}.`);
      recordOperation(
        "success",
        `${domain} draft approved`,
        withRequestId(
          `Approved as version ${response.version ?? "unknown"}.`,
          response.request_id ?? null,
        ),
      );
      trackEvent("policy_ops_approve_draft_success", {
        domain,
        version: response.version ?? null,
        requestId: response.request_id ?? null,
      });
      await Promise.all([
        policyBundleQuery.refetch(),
        governanceQuery.refetch(),
        auditsQuery.refetch(),
      ]);
    } catch (error) {
      const parsedError = parseBackendError(
        error,
        `We couldn't approve the ${domain} draft.`,
      );
      const message = withRequestId(parsedError.message, parsedError.requestId);
      showError(`We couldn't approve the ${domain} draft: ${message}`);
      recordOperation("error", `${domain} approval failed`, message);
      trackEvent(
        "policy_ops_approve_draft_failure",
        {
          domain,
          message: parsedError.message,
          requestId: parsedError.requestId,
        },
        { level: "error" },
      );
    } finally {
      setApprovingByDomain((current) => ({ ...current, [domain]: false }));
    }
  };

  const rollbackDomain = async (
    domain: PolicyDomain,
    targetVersion: number,
  ): Promise<void> => {
    setRollingBackByDomain((current) => ({ ...current, [domain]: true }));
    try {
      const response = await backendClient.post<GovernanceActionResponse>(
        "/governPolicyPacks",
        {
          action: "rollback_to_version",
          domain,
          region: "US",
          jurisdiction: "federal",
          targetVersion,
        },
      );
      showSuccess(
        `${domain} rolled back to v${targetVersion} (new v${response.version}).`,
      );
      recordOperation(
        "success",
        `${domain} rollback complete`,
        withRequestId(
          `Rollback target v${targetVersion}; new version ${
            response.version ?? "unknown"
          }.`,
          response.request_id ?? null,
        ),
      );
      trackEvent("policy_ops_rollback_success", {
        domain,
        targetVersion,
        version: response.version ?? null,
        requestId: response.request_id ?? null,
      });
      await Promise.all([
        policyBundleQuery.refetch(),
        governanceQuery.refetch(),
        auditsQuery.refetch(),
      ]);
    } catch (error) {
      const parsedError = parseBackendError(
        error,
        `We couldn't roll back ${domain}.`,
      );
      const message = withRequestId(parsedError.message, parsedError.requestId);
      showError(`We couldn't roll back ${domain}: ${message}`);
      recordOperation("error", `${domain} rollback failed`, message);
      trackEvent(
        "policy_ops_rollback_failure",
        {
          domain,
          message: parsedError.message,
          requestId: parsedError.requestId,
        },
        { level: "error" },
      );
    } finally {
      setRollingBackByDomain((current) => ({ ...current, [domain]: false }));
    }
  };

  const runDraftAgentReview = async (domain: PolicyDomain): Promise<void> => {
    const draftRow = governancePacks.find(
      (row) => row.domain === domain && row.status === "draft",
    );
    if (!draftRow) {
      showError(`No draft found for ${domain}.`);
      recordOperation("error", `${domain} review failed`, "No draft found.");
      return;
    }

    setReviewingByDomain((current) => ({ ...current, [domain]: true }));
    try {
      const result = await runAgentWorkflowMutation.mutateAsync(
        buildPolicyIngestionReviewWorkflow({
          domain,
          sourceLabel:
            typeof draftRow.source === "string"
              ? draftRow.source
              : "policy_pack_source",
          rawPayload: toRecord(draftRow.source),
          proposedPack: toRecord(draftRow.pack),
        }),
      );
      setLatestReviewByDomain((current) => ({
        ...current,
        [domain]: result.finalOutput,
      }));
      showSuccess(`${domain} draft agent review completed.`);
      recordOperation(
        "success",
        `${domain} draft reviewed`,
        "Agent workflow produced a review output.",
      );
      trackEvent("policy_ops_agent_review_success", {
        domain,
        workflowId: result.workflowId,
      });
    } catch (error) {
      const parsedError = parseBackendError(
        error,
        `We couldn't review the ${domain} draft with the agent workflow.`,
      );
      const message = withRequestId(parsedError.message, parsedError.requestId);
      showError(message);
      recordOperation("error", `${domain} review failed`, message);
      trackEvent(
        "policy_ops_agent_review_failure",
        {
          domain,
          message: parsedError.message,
          requestId: parsedError.requestId,
        },
        { level: "error" },
      );
    } finally {
      setReviewingByDomain((current) => ({ ...current, [domain]: false }));
    }
  };

  const setAdminStatus = async (
    targetUserId: string,
    active: boolean,
    notes?: string,
  ): Promise<void> => {
    setUpdatingAdminByUser((current) => ({
      ...current,
      [targetUserId]: true,
    }));
    try {
      const response = await backendClient.post<AdminStatusResponse>(
        "/governPolicyPacks",
        {
          action: "set_admin_status",
          targetUserId,
          active,
          notes,
        },
      );
      const statusLabel = response.admin?.active ? "active" : "inactive";
      showSuccess(`${targetUserId} is now ${statusLabel}.`);
      recordOperation(
        "success",
        "Admin status updated",
        withRequestId(
          `${targetUserId} is now ${statusLabel}.`,
          response.request_id ?? null,
        ),
      );
      trackEvent("policy_ops_admin_update_success", {
        targetUserId,
        active: Boolean(response.admin?.active),
        requestId: response.request_id ?? null,
      });
      await Promise.all([adminsQuery.refetch(), authProbeQuery.refetch()]);
    } catch (error) {
      const parsedError = parseBackendError(
        error,
        "We couldn't update policy admin access.",
      );
      const message = withRequestId(parsedError.message, parsedError.requestId);
      showError(`We couldn't update policy admin access: ${message}`);
      recordOperation("error", "Admin update failed", message);
      trackEvent(
        "policy_ops_admin_update_failure",
        {
          targetUserId,
          message: parsedError.message,
          requestId: parsedError.requestId,
        },
        { level: "error" },
      );
    } finally {
      setUpdatingAdminByUser((current) => ({
        ...current,
        [targetUserId]: false,
      }));
    }
  };

  const addAdminFromInput = async (): Promise<void> => {
    const targetUserId = adminUserIdInput.trim();
    if (!targetUserId) {
      showError("Enter a user ID to grant admin access.");
      recordOperation(
        "error",
        "Admin add rejected",
        "Admin user ID field was empty.",
      );
      return;
    }
    setIsSubmittingAdminUser(true);
    try {
      await setAdminStatus(targetUserId, true, adminNotesInput);
      setAdminUserIdInput("");
      setAdminNotesInput("");
    } finally {
      setIsSubmittingAdminUser(false);
    }
  };

  return (
    <Screen variant="scroll" contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text
          testID="policy-ops-screen-title"
          variant="headlineMedium"
          style={{ color: colors.text, fontWeight: "700" }}
        >
          Policy Ops
        </Text>
        <Text variant="bodyMedium" style={{ color: colors.textMuted }}>
          Stage, approve, and rollback policy packs without shipping stale
          rules.
        </Text>
      </View>

      <SurfaceCard testID="policy-ops-operations-health-section">
        <Text variant="labelMedium" style={{ color: colors.textFaint }}>
          OPERATIONS HEALTH
        </Text>
        <Text variant="bodySmall" style={{ color: colors.textMuted }}>
          {canMutatePolicy
            ? `Mutation access ready (${authProbeQuery.data?.authMode ?? "unknown"}).`
            : "Mutation access unavailable for this session."}
        </Text>
        <Text variant="bodySmall" style={{ color: colors.textMuted }}>
          {`Policy packs: ${
            policyBundleQuery.isError
              ? "error"
              : policyBundleQuery.isLoading
                ? "loading"
                : "ready"
          } · Governance: ${
            governanceQuery.isError
              ? "error"
              : governanceQuery.isLoading
                ? "loading"
                : "ready"
          } · Audits: ${
            auditsQuery.isError
              ? "error"
              : auditsQuery.isLoading
                ? "loading"
                : "ready"
          }`}
        </Text>
        <PrimaryButton
          disabled={isRefreshingPanels}
          onPress={() => {
            void refreshOperationalPanels();
          }}
        >
          {isRefreshingPanels ? "Refreshing panels..." : "Refresh all panels"}
        </PrimaryButton>
        {lastOperation ? (
          <Text
            variant="bodySmall"
            style={{
              color:
                lastOperation.kind === "success"
                  ? colors.positive
                  : colors.negative,
            }}
          >
            {`${lastOperation.title} · ${lastOperation.detail} · ${formatTimestamp(
              lastOperation.timestamp,
            )}`}
          </Text>
        ) : null}
      </SurfaceCard>

      <SurfaceCard testID="policy-ops-current-policy-packs-section">
        <Text variant="labelMedium" style={{ color: colors.textFaint }}>
          CURRENT POLICY PACKS
        </Text>
        {policyBundleQuery.isLoading ? (
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            Loading policy packs.
          </Text>
        ) : policyBundleQuery.isError ? (
          <View style={{ marginTop: tokens.space.xs, gap: tokens.space.xs }}>
            <Text variant="bodySmall" style={{ color: colors.negative }}>
              We could not load policy packs.
            </Text>
            <SecondaryButton
              testID="policy-ops-policy-packs-retry"
              onPress={() => {
                void policyBundleQuery.refetch();
              }}
            >
              Retry policy packs
            </SecondaryButton>
          </View>
        ) : policyDomains.length === 0 ? (
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            No policy packs are available yet.
          </Text>
        ) : (
          policyDomains.map((pack) =>
            pack ? (
              <View key={pack.domain} style={styles.row}>
                <Text variant="titleSmall" style={{ color: colors.text }}>
                  {`${pack.domain} · v${pack.version}`}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                  {`effective ${pack.effectiveFrom}`}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                  {`published ${pack.publishedAt}`}
                </Text>
              </View>
            ) : null,
          )
        )}
      </SurfaceCard>

      <SurfaceCard testID="policy-ops-refresh-checks-section">
        <Text variant="labelMedium" style={{ color: colors.textFaint }}>
          REFRESH CHECKS
        </Text>
        <Text variant="bodySmall" style={{ color: colors.textMuted }}>
          {authProbeQuery.isLoading
            ? "Checking policy mutation access..."
            : canMutatePolicy
              ? `Mutation access enabled (${authProbeQuery.data?.authMode ?? "unknown"})`
              : "Mutation access unavailable for this session."}
        </Text>
        <View style={{ marginTop: tokens.space.xs, gap: tokens.space.sm }}>
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            Rates
          </Text>
          <PrimaryButton
            disabled={isRefreshingRates || !canMutatePolicy}
            onPress={() => {
              void runPolicyRefresh("rates", { dryRun: true });
            }}
          >
            {isRefreshingRates
              ? "Checking rates refresh..."
              : "Dry-run rates refresh"}
          </PrimaryButton>
          <PrimaryButton
            disabled={isStagingRates || !canMutatePolicy}
            onPress={() => {
              void runPolicyRefresh("rates", {
                dryRun: false,
                publishMode: "draft",
              });
            }}
          >
            {isStagingRates ? "Staging rates draft..." : "Stage rates draft"}
          </PrimaryButton>
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            Thresholds
          </Text>
          <PrimaryButton
            disabled={isRefreshingThresholds || !canMutatePolicy}
            onPress={() => {
              void runPolicyRefresh("thresholds", { dryRun: true });
            }}
          >
            {isRefreshingThresholds
              ? "Checking thresholds refresh..."
              : "Dry-run thresholds refresh"}
          </PrimaryButton>
          <PrimaryButton
            disabled={isStagingThresholds || !canMutatePolicy}
            onPress={() => {
              void runPolicyRefresh("thresholds", {
                dryRun: false,
                publishMode: "draft",
              });
            }}
          >
            {isStagingThresholds
              ? "Staging thresholds draft..."
              : "Stage thresholds draft"}
          </PrimaryButton>
        </View>
      </SurfaceCard>

      <SurfaceCard testID="policy-ops-governance-actions-section">
        <Text variant="labelMedium" style={{ color: colors.textFaint }}>
          GOVERNANCE ACTIONS
        </Text>
        {governanceQuery.isLoading ? (
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            Loading governance history.
          </Text>
        ) : governanceQuery.isError ? (
          <View style={{ marginTop: tokens.space.xs, gap: tokens.space.xs }}>
            <Text variant="bodySmall" style={{ color: colors.negative }}>
              We could not load governance history.
            </Text>
            <SecondaryButton
              testID="policy-ops-governance-retry"
              onPress={() => {
                void governanceQuery.refetch();
              }}
            >
              Retry governance history
            </SecondaryButton>
          </View>
        ) : (
          governanceSnapshots.map((snapshot) => {
            const rollbackTarget = snapshot.approvedHistory[1]?.version ?? null;
            return (
              <View key={snapshot.domain} style={styles.row}>
                <Text variant="titleSmall" style={{ color: colors.text }}>
                  {snapshot.domain}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                  {snapshot.latestApproved
                    ? `Approved v${snapshot.latestApproved.version} · ${snapshot.latestApproved.effectiveFrom}`
                    : "No approved pack yet"}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                  {snapshot.latestDraft
                    ? `Draft v${snapshot.latestDraft.version} · ${snapshot.latestDraft.effectiveFrom}`
                    : "No staged draft"}
                </Text>
                <PrimaryButton
                  disabled={
                    !snapshot.latestDraft ||
                    Boolean(approvingByDomain[snapshot.domain]) ||
                    !canMutatePolicy
                  }
                  onPress={() => {
                    void approveLatestDraft(snapshot.domain);
                  }}
                >
                  {approvingByDomain[snapshot.domain]
                    ? "Approving draft..."
                    : "Approve latest draft"}
                </PrimaryButton>
                {policyIngestionAgentEnabled ? (
                  <PrimaryButton
                    disabled={
                      !snapshot.latestDraft ||
                      Boolean(reviewingByDomain[snapshot.domain]) ||
                      runAgentWorkflowMutation.isPending ||
                      !canMutatePolicy
                    }
                    onPress={() => {
                      void runDraftAgentReview(snapshot.domain);
                    }}
                  >
                    {reviewingByDomain[snapshot.domain]
                      ? "Running agent review..."
                      : "Run agent draft review"}
                  </PrimaryButton>
                ) : null}
                <PrimaryButton
                  disabled={
                    !rollbackTarget ||
                    Boolean(rollingBackByDomain[snapshot.domain]) ||
                    !canMutatePolicy
                  }
                  onPress={() => {
                    if (!rollbackTarget) return;
                    void rollbackDomain(snapshot.domain, rollbackTarget);
                  }}
                >
                  {rollingBackByDomain[snapshot.domain]
                    ? "Rolling back..."
                    : rollbackTarget
                      ? `Rollback to v${rollbackTarget}`
                      : "Rollback unavailable"}
                </PrimaryButton>
                {latestReviewByDomain[snapshot.domain] ? (
                  <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                    {latestReviewByDomain[snapshot.domain]}
                  </Text>
                ) : null}
              </View>
            );
          })
        )}
      </SurfaceCard>

      <SurfaceCard testID="policy-ops-admins-section">
        <Text variant="labelMedium" style={{ color: colors.textFaint }}>
          POLICY OPS ADMINS
        </Text>
        <Text variant="bodySmall" style={{ color: colors.textMuted }}>
          Manage the policy admin roster used for governance mutation access.
        </Text>
        <View style={{ marginTop: tokens.space.sm, gap: tokens.space.sm }}>
          <TextField
            label="Admin user ID"
            value={adminUserIdInput}
            onChangeText={setAdminUserIdInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextField
            label="Notes (optional)"
            value={adminNotesInput}
            onChangeText={setAdminNotesInput}
            autoCapitalize="sentences"
            autoCorrect
          />
          <PrimaryButton
            disabled={
              !canMutatePolicy ||
              isSubmittingAdminUser ||
              adminUserIdInput.trim().length === 0
            }
            onPress={() => {
              void addAdminFromInput();
            }}
          >
            {isSubmittingAdminUser
              ? "Adding admin..."
              : "Add / Reactivate admin"}
          </PrimaryButton>
        </View>
        <View style={{ marginTop: tokens.space.sm, gap: tokens.space.xs }}>
          {adminsQuery.isLoading ? (
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              Loading policy admins.
            </Text>
          ) : adminsQuery.isError ? (
            <View style={{ marginTop: tokens.space.xs, gap: tokens.space.xs }}>
              <Text variant="bodySmall" style={{ color: colors.negative }}>
                We could not load policy admins.
              </Text>
              <SecondaryButton
                testID="policy-ops-admins-retry"
                onPress={() => {
                  void adminsQuery.refetch();
                }}
              >
                Retry policy admins
              </SecondaryButton>
            </View>
          ) : adminsQuery.data && adminsQuery.data.length > 0 ? (
            adminsQuery.data.map((admin) => {
              const isUpdating = Boolean(updatingAdminByUser[admin.user_id]);
              return (
                <View key={admin.user_id} style={styles.row}>
                  <Text variant="titleSmall" style={{ color: colors.text }}>
                    {admin.user_id}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{
                      color: admin.active ? colors.positive : colors.textMuted,
                    }}
                  >
                    {admin.active ? "Active" : "Inactive"}
                  </Text>
                  {admin.notes ? (
                    <Text
                      variant="bodySmall"
                      style={{ color: colors.textMuted }}
                    >
                      {admin.notes}
                    </Text>
                  ) : null}
                  <PrimaryButton
                    disabled={!canMutatePolicy || isUpdating}
                    onPress={() => {
                      void setAdminStatus(
                        admin.user_id,
                        !admin.active,
                        admin.notes ?? undefined,
                      );
                    }}
                  >
                    {isUpdating
                      ? "Updating..."
                      : admin.active
                        ? "Deactivate admin"
                        : "Activate admin"}
                  </PrimaryButton>
                </View>
              );
            })
          ) : (
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              No policy admins are configured yet.
            </Text>
          )}
        </View>
      </SurfaceCard>

      <SurfaceCard testID="policy-ops-audit-log-section">
        <Text variant="labelMedium" style={{ color: colors.textFaint }}>
          POLICY AUDIT LOG
        </Text>
        {auditsQuery.isLoading ? (
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            Loading audit events.
          </Text>
        ) : auditsQuery.isError ? (
          <View style={{ marginTop: tokens.space.xs, gap: tokens.space.xs }}>
            <Text variant="bodySmall" style={{ color: colors.negative }}>
              We could not load audit events.
            </Text>
            <SecondaryButton
              testID="policy-ops-audits-retry"
              onPress={() => {
                void auditsQuery.refetch();
              }}
            >
              Retry audit events
            </SecondaryButton>
          </View>
        ) : auditsQuery.data && auditsQuery.data.length > 0 ? (
          auditsQuery.data.map((audit) => {
            const isAdminAudit = audit.domain === "policy_ops_admins";
            const targetUserId =
              typeof audit.metadata?.targetUserId === "string"
                ? audit.metadata.targetUserId
                : null;
            const activeValue =
              typeof audit.metadata?.active === "boolean"
                ? audit.metadata.active
                : null;
            const adminStateLabel =
              activeValue === null
                ? "status update"
                : activeValue
                  ? "active"
                  : "inactive";

            return (
              <View key={audit.id} style={styles.row}>
                <Text variant="titleSmall" style={{ color: colors.text }}>
                  {`${audit.domain} · ${audit.action}`}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                  {isAdminAudit
                    ? `${targetUserId ?? "unknown user"} → ${adminStateLabel}`
                    : `v${audit.source_version ?? "?"} → v${audit.target_version ?? "?"}`}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                  {formatTimestamp(audit.created_at)}
                </Text>
              </View>
            );
          })
        ) : (
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            No governance audit events yet.
          </Text>
        )}
      </SurfaceCard>

      {lastRatesResponse ? (
        <SurfaceCard>
          <Text variant="labelMedium" style={{ color: colors.textFaint }}>
            LAST RATES DRY-RUN
          </Text>
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            {formatJson(lastRatesResponse)}
          </Text>
        </SurfaceCard>
      ) : null}

      {lastThresholdsResponse ? (
        <SurfaceCard>
          <Text variant="labelMedium" style={{ color: colors.textFaint }}>
            LAST THRESHOLDS DRY-RUN
          </Text>
          <Text variant="bodySmall" style={{ color: colors.textMuted }}>
            {formatJson(lastThresholdsResponse)}
          </Text>
        </SurfaceCard>
      ) : null}
    </Screen>
  );
}
