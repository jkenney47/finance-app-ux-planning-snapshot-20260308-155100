import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";

import { Pill } from "@/components/common/Pill";
import { PrimaryButton } from "@/components/common/PrimaryButton";
import { ProgressBar } from "@/components/common/ProgressBar";
import { Screen } from "@/components/common/Screen";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import { SecondaryButton } from "@/components/common/SecondaryButton";
import { SegmentedControl } from "@/components/common/SegmentedControl";
import { Sheet } from "@/components/common/Sheet";
import { SurfaceCard } from "@/components/common/SurfaceCard";
import { TextField } from "@/components/common/TextField";
import { HeroMetric } from "@/components/dashboard/HeroMetric";
import { ProfileUtilityButton } from "@/components/dashboard/ProfileUtilityButton";
import { EmptyHint, ErrorNotice, Skeleton } from "@/components/state";
import { buildDashboardRefreshErrorDescription } from "@/components/state/asyncCopy";
import { Text } from "@/components/ui/text";
import { useAppTheme } from "@/hooks/useAppTheme";
import { useAskStore } from "@/stores/useAskStore";
import { useErrorBanner } from "@/hooks/useErrorBanner";
import { formatCurrency } from "@/utils/format";
import {
  useCurrentRoadmap,
  useFinancialSnapshot,
} from "@/utils/queries/useRoadmapCore";
import {
  useCreateGoalMutation,
  useGoalsQuery,
  useUpdateGoalMutation,
  type GoalItem,
} from "@/utils/queries/useGoals";
import { buildCoverageDisplay } from "@/utils/roadmap/experience";

type GoalState = "auto" | "ready" | "loading" | "empty" | "error";

const STATE_OPTIONS: Array<{
  label: string;
  value: GoalState;
  testID: string;
}> = [
  { label: "Auto", value: "auto", testID: "goals-screen-state-auto" },
  { label: "Ready", value: "ready", testID: "goals-screen-state-ready" },
  { label: "Loading", value: "loading", testID: "goals-screen-state-loading" },
  { label: "Empty", value: "empty", testID: "goals-screen-state-empty" },
  { label: "Error", value: "error", testID: "goals-screen-state-error" },
];

function parseCurrencyInput(rawValue: string): number | null {
  const cleaned = rawValue.replace(/[^0-9.]/g, "").trim();
  if (!cleaned) {
    return null;
  }

  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

export default function GoalsScreen(): JSX.Element {
  const router = useRouter();
  const { colors, tokens } = useAppTheme();
  const setAskContext = useAskStore((state) => state.setContext);
  const { showInfo, showError } = useErrorBanner();
  const goalsQuery = useGoalsQuery();
  const roadmapQuery = useCurrentRoadmap();
  const snapshotQuery = useFinancialSnapshot();
  const createGoalMutation = useCreateGoalMutation();
  const updateGoalMutation = useUpdateGoalMutation();

  const [screenState, setScreenState] = useState<GoalState>("auto");
  const [selectedGoal, setSelectedGoal] = useState<GoalItem | null>(null);
  const [isCreateSheetOpen, setCreateSheetOpen] = useState(false);

  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalSaved, setGoalSaved] = useState("");
  const [goalCadence, setGoalCadence] = useState("");
  const [goalMilestone, setGoalMilestone] = useState("");

  const goals = useMemo(() => goalsQuery.data ?? [], [goalsQuery.data]);
  const askMetricId = goals.length > 0 ? "goal_funding_progress" : "goal_setup";

  const resolvedState = useMemo<GoalState>(() => {
    if (screenState !== "auto") {
      return screenState;
    }

    if (goalsQuery.isLoading) {
      return "loading";
    }

    if (goalsQuery.isError) {
      return "error";
    }

    if (goals.length === 0) {
      return "empty";
    }

    return "ready";
  }, [goals.length, goalsQuery.isError, goalsQuery.isLoading, screenState]);

  useEffect(() => {
    setAskContext({
      screen: "goals",
      metricId: askMetricId,
    });
  }, [askMetricId, setAskContext]);

  const totalSaved = useMemo(
    () => goals.reduce((sum, goal) => sum + goal.saved, 0),
    [goals],
  );

  const totalTarget = useMemo(
    () => goals.reduce((sum, goal) => sum + goal.target, 0),
    [goals],
  );
  const roadmapCoverage = useMemo(
    () =>
      roadmapQuery.data
        ? buildCoverageDisplay({
            roadmap: roadmapQuery.data,
            snapshot: snapshotQuery.data,
          })
        : null,
    [roadmapQuery.data, snapshotQuery.data],
  );
  const roadmapGoalCopy = useMemo(() => {
    if (!roadmapQuery.data) {
      return null;
    }

    return (
      roadmapQuery.data.explanation.goalImpacts[0] ??
      `Keep goals visible, but let ${roadmapQuery.data.currentStage.label.toLowerCase()} set the pace before adding more optional commitments.`
    );
  }, [roadmapQuery.data]);

  const hero = (
    <HeroMetric
      label="Goals funded"
      value={totalSaved}
      caption={
        totalTarget > 0
          ? `${formatCurrency(totalTarget, {
              maximumFractionDigits: 0,
              minimumFractionDigits: 0,
            })} total targets`
          : "No active targets yet"
      }
    />
  );

  const resetGoalForm = (): void => {
    setGoalName("");
    setGoalTarget("");
    setGoalSaved("");
    setGoalCadence("");
    setGoalMilestone("");
  };

  const openCreateFlow = (): void => {
    setSelectedGoal(null);
    setCreateSheetOpen(true);
  };

  const handleCreateGoal = async (): Promise<void> => {
    const targetAmount = parseCurrencyInput(goalTarget);
    const savedAmount = parseCurrencyInput(goalSaved) ?? 0;

    if (!goalName.trim()) {
      showError("Add a goal name first.");
      return;
    }

    if (!targetAmount || targetAmount <= 0) {
      showError("Enter a valid target amount greater than zero.");
      return;
    }

    try {
      await createGoalMutation.mutateAsync({
        name: goalName,
        targetAmount,
        savedAmount,
        cadence: goalCadence,
        milestoneNote: goalMilestone,
      });
      setCreateSheetOpen(false);
      resetGoalForm();
      setScreenState("auto");
      showInfo("Goal created.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create goal.";
      showError(message);
    }
  };

  const handleIncrementGoal = async (goal: GoalItem): Promise<void> => {
    const updatedSaved = goal.saved + 100;

    try {
      await updateGoalMutation.mutateAsync({
        goalId: goal.id,
        savedAmount: updatedSaved,
      });

      setSelectedGoal({
        ...goal,
        saved: updatedSaved,
        progress: goal.target > 0 ? Math.min(updatedSaved / goal.target, 1) : 0,
      });
      showInfo("Added $100 contribution.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update goal.";
      showError(message);
    }
  };

  const renderGoalCards = (): JSX.Element[] =>
    goals.map((goal) => (
      <SurfaceCard key={goal.id}>
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            <Text variant="titleMedium" style={{ color: colors.text }}>
              {goal.name}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.textMuted }}>
              {goal.cadence}
            </Text>
          </View>
          <Pressable
            onPress={() => setSelectedGoal(goal)}
            className="rounded-[12px] px-2 py-1.5"
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
              backgroundColor: colors.surface2,
            })}
            role="button"
            accessibilityRole="button"
            accessibilityLabel={`Manage ${goal.name}`}
          >
            <Text variant="labelMedium" style={{ color: colors.textMuted }}>
              Manage
            </Text>
          </Pressable>
        </View>

        <View className="flex-row items-center justify-between gap-3">
          <Text
            variant="titleLarge"
            style={{
              color: colors.text,
              fontWeight: "700",
              fontVariant: ["tabular-nums"],
            }}
          >
            {formatCurrency(goal.saved)}
          </Text>
          <View
            className="rounded-[28px] border px-3 py-2"
            style={{
              borderRadius: tokens.radius.xl,
              borderColor: colors.borderStrong,
              backgroundColor: colors.surface2,
            }}
          >
            <Text variant="labelMedium" style={{ color: colors.textMuted }}>
              Target {formatCurrency(goal.target)}
            </Text>
          </View>
        </View>

        <ProgressBar
          progress={goal.progress}
          color={colors.accent}
          accessibilityLabel={`${goal.name} progress`}
        />

        <Text variant="bodySmall" style={{ color: colors.textMuted }}>
          {goal.nextMilestone}
        </Text>

        <SecondaryButton
          compact
          onPress={() => setSelectedGoal(goal)}
          accessibilityLabel={`View plan for ${goal.name}`}
        >
          View plan
        </SecondaryButton>
      </SurfaceCard>
    ));

  const renderContent = (): JSX.Element | JSX.Element[] => {
    switch (resolvedState) {
      case "loading":
        return (
          <View style={{ gap: tokens.space.md }}>
            <Skeleton height={60} radius={tokens.radius.md} />
            <Skeleton height={180} radius={tokens.radius.md} />
            <Skeleton height={180} radius={tokens.radius.md} />
          </View>
        );
      case "empty":
        return (
          <EmptyHint
            title="Create your first goal"
            description="Add a target and timeline, then track progress with recurring contributions."
            actionLabel="New goal"
            onActionPress={openCreateFlow}
          />
        );
      case "error":
        return (
          <ErrorNotice
            description={buildDashboardRefreshErrorDescription("your goals")}
            onRetry={() => {
              setScreenState("auto");
              void goalsQuery.refetch();
            }}
          />
        );
      case "ready":
      default:
        return renderGoalCards();
    }
  };

  return (
    <>
      <Screen
        variant="scroll"
        contentContainerStyle={{
          paddingVertical: tokens.space.lg,
          gap: tokens.space.lg,
        }}
      >
        <ScreenHeader
          eyebrow="Goal planning"
          title="Goals"
          titleTestID="goals-screen-title"
          description="Set targets, track progress, and keep your contribution plan visible."
          trailingAccessory={
            <ProfileUtilityButton
              onPress={() => router.push("/(dashboard)/profile")}
              testID="goals-utility-button"
            />
          }
        />
        {roadmapQuery.data && roadmapGoalCopy ? (
          <SurfaceCard
            testID="goals-roadmap-context"
            contentStyle={{ gap: tokens.space.sm }}
          >
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1 gap-1">
                <Text variant="labelMedium" style={{ color: colors.textFaint }}>
                  GOALS IN YOUR ROADMAP
                </Text>
                <Text variant="titleMedium" style={{ color: colors.text }}>
                  {`${roadmapQuery.data.currentStage.label} is setting the pace right now`}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.textMuted }}>
                  {roadmapGoalCopy}
                </Text>
              </View>
              {roadmapCoverage ? (
                <Pill active tone={roadmapCoverage.tone}>
                  {roadmapCoverage.label}
                </Pill>
              ) : null}
            </View>
            <View style={{ gap: tokens.space.xs }}>
              <SecondaryButton
                onPress={() => router.push("/(dashboard)/journey")}
              >
                See roadmap context
              </SecondaryButton>
              {roadmapCoverage &&
              roadmapCoverage.label !== "Coverage strong" ? (
                <SecondaryButton
                  onPress={() => router.push("/(dashboard)/accounts")}
                >
                  {roadmapCoverage.actionLabel}
                </SecondaryButton>
              ) : null}
            </View>
          </SurfaceCard>
        ) : null}
        <View
          className="rounded-[22px] p-5"
          style={{
            borderRadius: tokens.radius.lg,
            backgroundColor: colors.accentSoft,
          }}
        >
          <Text variant="labelMedium" style={{ color: colors.textFaint }}>
            GOAL MOMENTUM
          </Text>
          {hero}
        </View>
        <SegmentedControl
          value={screenState}
          onChange={(value) => setScreenState(value as GoalState)}
          options={STATE_OPTIONS}
        />
        {renderContent()}
        <PrimaryButton onPress={openCreateFlow}>Create goal</PrimaryButton>
      </Screen>

      <Sheet
        isOpen={Boolean(selectedGoal)}
        onDismiss={() => setSelectedGoal(null)}
        testID="goal-detail-sheet"
      >
        {selectedGoal ? (
          <View style={{ gap: tokens.space.md }}>
            <Text
              variant="headlineSmall"
              style={{ color: colors.text, fontWeight: "700" }}
            >
              {selectedGoal.name}
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.textMuted }}>
              {selectedGoal.cadence}
            </Text>
            <Text
              variant="titleLarge"
              style={{
                color: colors.text,
                fontWeight: "700",
                fontVariant: ["tabular-nums"],
              }}
            >
              Saved {formatCurrency(selectedGoal.saved)}
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.textMuted }}>
              Target of {formatCurrency(selectedGoal.target)}
            </Text>
            <ProgressBar
              progress={selectedGoal.progress}
              color={colors.accent}
              accessibilityLabel={`${selectedGoal.name} progress`}
            />
            <Text variant="bodySmall" style={{ color: colors.textFaint }}>
              {selectedGoal.nextMilestone}
            </Text>
            <PrimaryButton
              loading={updateGoalMutation.isPending}
              onPress={() => void handleIncrementGoal(selectedGoal)}
            >
              Log +$100 progress
            </PrimaryButton>
            <SecondaryButton
              onPress={() => {
                setSelectedGoal(null);
                router.push("/(dashboard)/journey");
              }}
            >
              Adjust contribution
            </SecondaryButton>
            <SecondaryButton compact onPress={() => setSelectedGoal(null)}>
              Close
            </SecondaryButton>
          </View>
        ) : null}
      </Sheet>

      <Sheet
        isOpen={isCreateSheetOpen}
        onDismiss={() => setCreateSheetOpen(false)}
        testID="goal-create-sheet"
      >
        <View style={{ gap: tokens.space.md }}>
          <Text
            variant="headlineSmall"
            style={{ color: colors.text, fontWeight: "700" }}
          >
            Create a new goal
          </Text>
          <TextField
            label="Goal name"
            value={goalName}
            onChangeText={setGoalName}
            placeholder="Home down payment"
            testID="goal-name-input"
          />
          <TextField
            label="Target amount"
            value={goalTarget}
            onChangeText={setGoalTarget}
            keyboardType="decimal-pad"
            placeholder="60000"
            testID="goal-target-input"
          />
          <TextField
            label="Already saved (optional)"
            value={goalSaved}
            onChangeText={setGoalSaved}
            keyboardType="decimal-pad"
            placeholder="0"
            testID="goal-saved-input"
          />
          <TextField
            label="Contribution cadence"
            value={goalCadence}
            onChangeText={setGoalCadence}
            placeholder="Monthly auto-save"
            testID="goal-cadence-input"
          />
          <TextField
            label="Milestone note"
            value={goalMilestone}
            onChangeText={setGoalMilestone}
            placeholder="$20k in 4 months"
            testID="goal-milestone-input"
          />
          <PrimaryButton
            loading={createGoalMutation.isPending}
            onPress={() => void handleCreateGoal()}
          >
            Save goal
          </PrimaryButton>
          <SecondaryButton
            onPress={() => {
              setCreateSheetOpen(false);
              router.push("/(ops)/agent-hub");
            }}
          >
            Ask AI for goal plan
          </SecondaryButton>
        </View>
      </Sheet>
    </>
  );
}
