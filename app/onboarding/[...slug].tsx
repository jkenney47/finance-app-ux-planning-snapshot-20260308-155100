import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";

import { AccountCategoryList } from "@/components/onboarding/AccountCategoryList";
import { ConditionalTextField } from "@/components/onboarding/ConditionalTextField";
import { InlineFollowupBlock } from "@/components/onboarding/InlineFollowupBlock";
import { LoadingChecklist } from "@/components/onboarding/LoadingChecklist";
import { MultiSelectChipGroup } from "@/components/onboarding/MultiSelectChipGroup";
import { OnboardingScaffold } from "@/components/onboarding/OnboardingScaffold";
import { resolveGuardRedirect } from "@/components/onboarding/routeConfig";
import { RoadmapPreviewCard } from "@/components/onboarding/RoadmapPreviewCard";
import { RoadmapRevealHero } from "@/components/onboarding/RoadmapRevealHero";
import { SingleSelectCardGroup } from "@/components/onboarding/SingleSelectCardGroup";
import { SummaryBulletCard } from "@/components/onboarding/SummaryBulletCard";
import { buildOnboardingSummaryBullets } from "@/components/onboarding/summary";
import { TrustBulletRow } from "@/components/onboarding/TrustBulletRow";
import { TextField } from "@/components/common/TextField";
import { Text } from "@/components/ui/text";
import { useDashboardSummary } from "@/hooks/useDashboardData";
import { useErrorBanner } from "@/hooks/useErrorBanner";
import { useOnboardingStore } from "@/stores/useOnboardingStore";
import { useSessionStore } from "@/stores/useSessionStore";
import { useMockLinkedAccountsStore } from "@/stores/useMockLinkedAccountsStore";
import { trackConversionEvent, trackEvent } from "@/utils/analytics";
import { signUp } from "@/utils/auth";
import { formatError } from "@/utils/errors";
import type {
  OnboardingLinkCategory,
  OnboardingRouteId,
} from "@/utils/contracts/onboarding";
import {
  getMockLinkingState,
  getNextMockLinkScenario,
} from "@/utils/onboarding/mockLinking";
import { isLivePlaidLinkEnabled } from "@/utils/account";
import { resolveCurrentRoadmapPayload } from "@/utils/roadmap/readModels";

const AUTH_BYPASS_ENABLED = process.env.EXPO_PUBLIC_BYPASS_AUTH === "true";

const HELP_GOAL_OPTIONS = [
  { label: "Getting control of spending", value: "spending_control" },
  { label: "Paying off debt", value: "debt_payoff" },
  { label: "Building an emergency fund", value: "emergency_fund" },
  { label: "Buying a home", value: "home_purchase" },
  { label: "Saving for retirement", value: "retirement" },
  { label: "Feeling confident about what to do next", value: "clarity" },
  { label: "Something else", value: "other" },
] as const;

const URGENT_AREA_OPTIONS = [
  { label: "Covering monthly expenses reliably", value: "monthly_expenses" },
  { label: "Getting debt under control", value: "debt" },
  { label: "Building savings", value: "savings" },
  { label: "Planning for a major goal", value: "major_goal" },
  { label: "Making better long-term decisions", value: "long_term_decisions" },
  { label: "I mostly need clarity", value: "clarity" },
] as const;

const PROGRESS_HORIZON_OPTIONS = [
  { label: "In the next 3 months", value: "within_3_months" },
  { label: "Within a year", value: "within_1_year" },
  { label: "Over the next few years", value: "next_few_years" },
  { label: "I’m mainly focused on the long term", value: "long_term" },
] as const;

const MAJOR_GOAL_OPTIONS = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
] as const;

const MAJOR_GOAL_TYPE_OPTIONS = [
  { label: "Home purchase", value: "home_purchase" },
  { label: "Retirement", value: "retirement" },
  { label: "Education", value: "education" },
  { label: "Career change", value: "career_change" },
  { label: "Family / children", value: "family_children" },
  { label: "Large purchase", value: "large_purchase" },
  { label: "Other", value: "other" },
] as const;

const MAJOR_GOAL_TIMING_OPTIONS = [
  { label: "Within 1 year", value: "under_1_year" },
  { label: "1–3 years", value: "one_to_three_years" },
  { label: "3–5 years", value: "three_to_five_years" },
  { label: "5+ years", value: "five_plus_years" },
] as const;

const MONTHLY_SITUATION_OPTIONS = [
  {
    label: "I’m current on bills and have breathing room",
    value: "current_with_breathing_room",
  },
  { label: "I’m current, but it feels tight", value: "current_but_tight" },
  {
    label: "I sometimes fall behind or juggle payments",
    value: "behind_or_juggling",
  },
  { label: "I’m not sure", value: "unsure" },
] as const;

const ESSENTIALS_COVERAGE_OPTIONS = [
  { label: "Yes, comfortably", value: "comfortable" },
  { label: "Usually, but it’s tight", value: "tight" },
  { label: "Not consistently", value: "not_consistent" },
  { label: "I’m not sure", value: "unsure" },
] as const;

const MAIN_STRUGGLE_OPTIONS = [
  { label: "Not knowing what to prioritize", value: "prioritization" },
  { label: "Overspending", value: "overspending" },
  { label: "Debt stress", value: "debt_stress" },
  { label: "Inconsistent income", value: "inconsistent_income" },
  { label: "Inconsistent saving", value: "inconsistent_saving" },
  { label: "Uncertainty about investing", value: "investing_uncertainty" },
  { label: "Staying organized", value: "organization" },
  { label: "Feeling behind", value: "feeling_behind" },
  { label: "Something else", value: "other" },
] as const;

const PAST_ATTEMPT_OPTIONS = [
  { label: "Budgeting apps", value: "budgeting_apps" },
  { label: "Spreadsheets", value: "spreadsheets" },
  { label: "Advice from friends or family", value: "friends_family" },
  { label: "A financial advisor", value: "financial_advisor" },
  { label: "Doing it myself", value: "diy" },
  { label: "Mostly avoiding it", value: "avoidance" },
  { label: "Other", value: "other" },
] as const;

const ATTEMPT_REASON_OPTIONS = [
  { label: "Too complicated", value: "too_complicated" },
  { label: "Too time-consuming", value: "too_time_consuming" },
  { label: "Didn’t feel personalized", value: "not_personalized" },
  { label: "Didn’t trust the advice", value: "didnt_trust" },
  { label: "Hard to stay consistent", value: "hard_to_stay_consistent" },
  { label: "Still didn’t know what to do next", value: "still_no_next_step" },
  { label: "My situation kept changing", value: "situation_kept_changing" },
] as const;

const HOUSEHOLD_OPTIONS = [
  { label: "Single", value: "single" },
  { label: "Partnered", value: "partnered" },
  { label: "Married", value: "married" },
  { label: "Prefer not to say", value: "prefer_not_to_say" },
] as const;

const DEPENDENTS_OPTIONS = [
  { label: "No", value: "none" },
  { label: "Children", value: "children" },
  { label: "Parents or family", value: "parents_family" },
  { label: "Other dependents", value: "other_dependents" },
] as const;

const HOUSING_OPTIONS = [
  { label: "Rent", value: "rent" },
  { label: "Own with a mortgage", value: "mortgage" },
  { label: "Own outright", value: "own_outright" },
  { label: "Living with family / other", value: "family_other" },
] as const;

const INCOME_TYPE_OPTIONS = [
  { label: "Salaried", value: "salaried" },
  { label: "Hourly", value: "hourly" },
  { label: "Self-employed", value: "self_employed" },
  { label: "Multiple income sources", value: "multiple_sources" },
  { label: "Variable income", value: "variable" },
] as const;

const INCOME_PREDICTABILITY_OPTIONS = [
  { label: "Very predictable", value: "very_predictable" },
  { label: "Somewhat predictable", value: "somewhat_predictable" },
  { label: "Not very predictable", value: "not_very_predictable" },
] as const;

const EMPLOYER_MATCH_OPTIONS = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
  { label: "Not sure", value: "not_sure" },
] as const;

const FULL_MATCH_OPTIONS = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
  { label: "Not sure", value: "not_sure" },
] as const;

const UPCOMING_EVENTS_OPTIONS = [
  { label: "Buying a home", value: "home_purchase" },
  { label: "Moving", value: "moving" },
  { label: "Wedding", value: "wedding" },
  { label: "Children", value: "children" },
  { label: "Education", value: "education" },
  { label: "Career change", value: "career_change" },
  { label: "Large purchase", value: "large_purchase" },
  { label: "None of these", value: "none" },
] as const;

const GUIDANCE_DIRECTNESS_OPTIONS = [
  { label: "Just tell me the recommendation", value: "recommend_only" },
  {
    label: "Recommend a path and explain the tradeoffs",
    value: "recommend_with_tradeoffs",
  },
  { label: "Show me the options and let me choose", value: "show_options" },
] as const;

const PATH_PREFERENCE_OPTIONS = [
  { label: "The mathematically strongest path", value: "math_first" },
  { label: "The path I’m most likely to stick with", value: "stick_with_it" },
  { label: "A balance of both", value: "balanced" },
] as const;

const BIGGEST_FEAR_OPTIONS = [
  { label: "Paying off the wrong thing first", value: "wrong_priority" },
  { label: "Not saving enough", value: "not_saving_enough" },
  { label: "Delaying investing too long", value: "delaying_investing" },
  { label: "Overcommitting to a goal", value: "overcommitting_goal" },
  { label: "Missing something important", value: "missing_something" },
  { label: "I’m not sure", value: "not_sure" },
] as const;

const GENERATING_STEPS = [
  "Reviewing cash flow",
  "Checking debt obligations",
  "Estimating emergency-fund readiness",
  "Aligning your goals with your finances",
  "Building your first roadmap",
] as const;

function getRouteFromSlug(
  slug: string[] | string | undefined,
): OnboardingRouteId {
  const parts = Array.isArray(slug) ? slug : slug ? [slug] : [];
  const candidate =
    `/onboarding/${parts.join("/") || "welcome"}` as OnboardingRouteId;
  return candidate;
}

function routeLabelFromPath(path: OnboardingRouteId): string {
  return path.split("/").at(-1)?.replace(/-/g, " ") ?? "step";
}

function deriveLinkedCategoriesFromTypes(
  accountTypes: string[],
  fallback: OnboardingLinkCategory[],
): OnboardingLinkCategory[] {
  if (accountTypes.length === 0) {
    return fallback;
  }

  const categories = new Set<OnboardingLinkCategory>();
  for (const accountType of accountTypes) {
    const normalized = accountType.toLowerCase();
    if (normalized.includes("checking") || normalized.includes("savings")) {
      categories.add("checking_savings");
    }
    if (normalized.includes("credit")) {
      categories.add("credit_cards");
    }
    if (normalized.includes("loan")) {
      categories.add("loans");
    }
    if (
      normalized.includes("retirement") ||
      normalized.includes("401") ||
      normalized.includes("brokerage")
    ) {
      categories.add("retirement_investments");
    }
    if (normalized.includes("mortgage")) {
      categories.add("mortgage");
    }
  }

  return categories.size > 0 ? [...categories] : fallback;
}

function hasCoreTransactionalAccount(accountTypes: string[]): boolean {
  return accountTypes.some((accountType) => {
    const normalized = accountType.toLowerCase();
    return normalized.includes("checking") || normalized.includes("credit");
  });
}

export default function OnboardingRouteScreen(): JSX.Element {
  const { slug } = useLocalSearchParams<{ slug?: string[] }>();
  const route = getRouteFromSlug(slug);
  const router = useRouter();
  const { showError, showInfo, showSuccess } = useErrorBanner();
  const summaryQuery = useDashboardSummary();
  const livePlaidLinkEnabled = isLivePlaidLinkEnabled();
  const session = useSessionStore((state) => state.session);
  const onboarding = useOnboardingStore();
  const {
    hydrateAuth,
    setCurrentRoute,
    setIntakeValues,
    saveIntake,
    markIntakeStarted,
    markIntakeCompleted,
    applyMockLinkScenario,
    setLinkingState,
    setGeneratedRoadmap,
    markOnboardingComplete,
  } = useOnboardingStore((state) => state);
  const linkMockAccounts = useMockLinkedAccountsStore(
    (state) => state.linkMockAccounts,
  );
  const generatingStartedRef = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loadingAccountCreate, setLoadingAccountCreate] = useState(false);
  const [activeGenerationIndex, setActiveGenerationIndex] = useState(0);

  const roadmapPayload = onboarding.generatedRoadmap;
  const summaryBullets = useMemo(
    () => buildOnboardingSummaryBullets(onboarding.intake),
    [onboarding.intake],
  );

  useEffect(() => {
    hydrateAuth({
      userId: session?.user?.id ?? onboarding.auth.userId,
      accountCreated:
        AUTH_BYPASS_ENABLED ||
        Boolean(session?.user?.id) ||
        onboarding.auth.accountCreated,
    });
  }, [
    hydrateAuth,
    onboarding.auth.accountCreated,
    onboarding.auth.userId,
    session?.user?.id,
  ]);

  useEffect(() => {
    setCurrentRoute(route);
    const redirect = resolveGuardRedirect(route, useOnboardingStore.getState());
    if (redirect && redirect !== route) {
      router.replace(redirect);
    }
  }, [route, router, setCurrentRoute]);

  useEffect(() => {
    if (!summaryQuery.data || onboarding.linking.mockScenario !== "none") {
      return;
    }

    const linkedCount = summaryQuery.data.accounts.length;
    if (linkedCount === 0) return;

    const accountTypes = summaryQuery.data.accounts.map(
      (account) => account.type,
    );

    setLinkingState({
      linkedAccountsCount: linkedCount,
      linkedInstitutionsCount: summaryQuery.data.institutionStatuses.length,
      coreTransactionalLinked: hasCoreTransactionalAccount(accountTypes),
      linkedCategories: deriveLinkedCategoriesFromTypes(
        accountTypes,
        onboarding.linking.linkedCategories,
      ),
    });
  }, [
    onboarding.linking.linkedCategories,
    onboarding.linking.mockScenario,
    setLinkingState,
    summaryQuery.data,
  ]);

  useEffect(() => {
    if (
      route !== "/onboarding/generating-roadmap" ||
      generatingStartedRef.current
    ) {
      return;
    }

    if (!onboarding.linking.coreTransactionalLinked) {
      return;
    }

    generatingStartedRef.current = true;
    trackEvent("roadmap_generation_started");
    let index = 0;
    const interval = setInterval(() => {
      index = Math.min(index + 1, GENERATING_STEPS.length - 1);
      setActiveGenerationIndex(index);
    }, 500);

    const build = async (): Promise<void> => {
      try {
        const payload = resolveCurrentRoadmapPayload({
          intake: useOnboardingStore.getState().intake,
          linking: useOnboardingStore.getState().linking,
          summary: summaryQuery.data,
        });
        if (!payload) {
          throw new Error("Roadmap payload unavailable");
        }
        setGeneratedRoadmap(payload);
        trackEvent("roadmap_generation_succeeded", {
          coverage_level: payload.overallCoverageLevel,
        });
        setTimeout(() => {
          clearInterval(interval);
          router.replace("/onboarding/roadmap-reveal");
        }, 1200);
      } catch (error) {
        clearInterval(interval);
        trackEvent("roadmap_generation_failed", {
          reason: error instanceof Error ? error.message : "unknown",
        });
        showError(
          "We couldn’t build your roadmap right now. Please try again.",
        );
      }
    };

    void build();

    return () => {
      clearInterval(interval);
    };
  }, [
    onboarding.linking.coreTransactionalLinked,
    onboarding.linking.mockScenario,
    route,
    router,
    setGeneratedRoadmap,
    showError,
    summaryQuery.data,
  ]);

  const goTo = (nextRoute: OnboardingRouteId): void => {
    router.replace(nextRoute);
  };

  const completeStep = (
    currentRoute: OnboardingRouteId,
    nextRoute: OnboardingRouteId,
    patch?: Partial<typeof onboarding.intake>,
  ): void => {
    if (patch) {
      saveIntake(currentRoute, patch);
    } else {
      saveIntake(currentRoute, {});
    }
    trackEvent("onboarding_step_completed", { step_id: currentRoute });
    goTo(nextRoute);
  };

  const handleCreateAccount = async (): Promise<void> => {
    if (onboarding.auth.accountCreated || session?.user?.id) {
      showSuccess("Progress saved");
      goTo("/onboarding/intake-intro");
      return;
    }

    if (AUTH_BYPASS_ENABLED) {
      hydrateAuth({
        userId: "mock-dev-user",
        accountCreated: true,
      });
      showSuccess("Progress saved");
      goTo("/onboarding/intake-intro");
      return;
    }

    if (!email.includes("@")) {
      showError("Enter a valid email address");
      return;
    }

    if (password.length < 8) {
      showError("Use at least 8 characters");
      return;
    }

    if (loadingAccountCreate) return;
    setLoadingAccountCreate(true);
    const { error, data } = await signUp(email.trim(), password);
    setLoadingAccountCreate(false);

    if (error) {
      showError(
        `We couldn’t create your account right now. Please try again. ${formatError(error)}`,
      );
      return;
    }

    hydrateAuth({
      userId: data?.id,
      accountCreated: true,
    });
    showSuccess("Progress saved");
    goTo("/onboarding/intake-intro");
  };

  const handleMockLink = (): void => {
    const nextScenario = getNextMockLinkScenario(
      onboarding.linking.mockScenario,
    );
    applyMockLinkScenario(nextScenario);
    linkMockAccounts();
    trackEvent("account_link_succeeded", {
      has_core_link: getMockLinkingState(nextScenario).coreTransactionalLinked,
      linked_categories_count:
        getMockLinkingState(nextScenario).linkedCategories.length,
    });
    showInfo("Account link updated");
  };

  const handleLinkPrimary = (): void => {
    trackEvent("account_link_started", {
      has_core_link: onboarding.linking.coreTransactionalLinked,
    });

    if (!livePlaidLinkEnabled || AUTH_BYPASS_ENABLED) {
      handleMockLink();
      return;
    }

    router.push({
      pathname: "/(auth)/plaid-link",
      params: {
        returnTo: encodeURIComponent("/onboarding/link-accounts"),
      },
    });
  };

  const handleFinishOnboarding = (): void => {
    markOnboardingComplete();
    trackConversionEvent("onboarding_completed", {
      completion_mode: "full",
      remaining_inputs_count: 0,
    });
    trackEvent("onboarding_completed_state", {
      has_core_link: onboarding.linking.coreTransactionalLinked,
      linked_categories_count: onboarding.linking.linkedCategories.length,
    });
    router.replace("/(dashboard)/journey");
  };

  const renderContent = (): JSX.Element => {
    switch (route) {
      case "/onboarding/welcome":
        return (
          <OnboardingScaffold
            title="A financial roadmap built around your life"
            helperText="See what to do next, why it matters, and what it unlocks without spreadsheets, jargon, or pressure."
            primaryCtaLabel="See how it works"
            secondaryCtaLabel="Sign in"
            footerNote="Preview the experience first. Link accounts after we understand your priorities."
            onPrimaryPress={() => goTo("/onboarding/demo-roadmap")}
            onSecondaryPress={() => router.push("/(unauth)/sign-in")}
          >
            <Text variant="labelMedium">
              Personal finance, without the guesswork
            </Text>
          </OnboardingScaffold>
        );

      case "/onboarding/demo-roadmap":
        return (
          <OnboardingScaffold
            title="This is what your roadmap will look like"
            helperText="Once your data is connected, you’ll see your current stage, what matters now, and the next action we recommend."
            showBack
            onBackPress={() => goTo("/onboarding/welcome")}
            primaryCtaLabel="Build my roadmap"
            secondaryCtaLabel="Back"
            onPrimaryPress={() => goTo("/onboarding/create-account")}
            onSecondaryPress={() => goTo("/onboarding/welcome")}
          >
            <Text variant="labelMedium">Sample roadmap</Text>
            <RoadmapPreviewCard
              stage="Clear Expensive Debt"
              currentFocus="Highest-interest balance first"
              nextAction="Increase your monthly debt payment by $250"
              keyMetric="Estimated debt-free date · 18 months"
              whyThisNow="High-interest debt is costing more than your cash can earn elsewhere."
              badgeLabel="Sample data"
            />
          </OnboardingScaffold>
        );

      case "/onboarding/create-account":
        return (
          <OnboardingScaffold
            title="Save your progress and keep going"
            helperText="Create your account to continue into the advisor intake and securely save your setup."
            primaryCtaLabel="Continue"
            secondaryCtaLabel="Already have an account? Sign in"
            primaryLoading={loadingAccountCreate}
            onPrimaryPress={handleCreateAccount}
            onSecondaryPress={() => router.push("/(unauth)/sign-in")}
            footerNote="By continuing, you agree to the Terms and Privacy Policy."
          >
            <Text variant="labelMedium">Create your account</Text>
            {!AUTH_BYPASS_ENABLED ? (
              <>
                <TextField
                  label="Email address"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
                <TextField
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
                <Text variant="bodySmall">Use at least 8 characters.</Text>
              </>
            ) : (
              <Text variant="bodyMedium">
                Auth bypass is enabled, so this step will mark the account as
                created locally.
              </Text>
            )}
          </OnboardingScaffold>
        );

      case "/onboarding/intake-intro":
        return (
          <OnboardingScaffold
            title="Let’s build this around your real priorities"
            helperText="This takes about 5–7 minutes. Your account data shows what happened. These questions help us understand what matters, what has been difficult, and how to guide you well."
            showBack
            onBackPress={() => goTo("/onboarding/create-account")}
            primaryCtaLabel="Start intake"
            onPrimaryPress={() => {
              markIntakeStarted();
              trackEvent("onboarding_started");
              goTo("/onboarding/intake/help-goal");
            }}
          >
            <Text variant="labelMedium">Advisor intake</Text>
            <SummaryBulletCard
              bullets={[
                "Prioritize the right first stage",
                "Show tradeoffs clearly",
                "Build your roadmap on real context, not assumptions",
              ]}
            />
          </OnboardingScaffold>
        );

      case "/onboarding/intake/help-goal":
        return (
          <OnboardingScaffold
            sectionLabel="Your priorities"
            progressCurrent={1}
            progressTotal={13}
            title="What do you want the most help with right now?"
            helperText="We’ll use this to decide what your roadmap should prioritize first."
            showBack
            onBackPress={() => goTo("/onboarding/intake-intro")}
            primaryCtaLabel="Continue"
            onPrimaryPress={() => {
              if (!onboarding.intake.primaryHelpGoal) {
                showError("Choose what you want the most help with right now.");
                return;
              }
              if (
                onboarding.intake.primaryHelpGoal === "other" &&
                !onboarding.intake.primaryHelpGoalOtherText?.trim()
              ) {
                showError("Tell us briefly what you want help with.");
                return;
              }
              completeStep(route, "/onboarding/intake/urgency-timeline");
            }}
          >
            <SingleSelectCardGroup
              value={onboarding.intake.primaryHelpGoal}
              options={HELP_GOAL_OPTIONS}
              onChange={(value) => setIntakeValues({ primaryHelpGoal: value })}
            />
            <ConditionalTextField
              visible={onboarding.intake.primaryHelpGoal === "other"}
              value={onboarding.intake.primaryHelpGoalOtherText ?? ""}
              onChangeText={(value) =>
                setIntakeValues({ primaryHelpGoalOtherText: value })
              }
              placeholder="Tell us briefly"
            />
          </OnboardingScaffold>
        );

      case "/onboarding/intake/urgency-timeline":
        return (
          <OnboardingScaffold
            sectionLabel="Your priorities"
            progressCurrent={2}
            progressTotal={13}
            title="What feels most urgent today?"
            helperText="This helps separate immediate pressure from longer-term planning."
            showBack
            onBackPress={() => goTo("/onboarding/intake/help-goal")}
            primaryCtaLabel="Continue"
            onPrimaryPress={() => {
              if (
                !onboarding.intake.urgentArea ||
                !onboarding.intake.progressHorizon
              ) {
                showError(
                  "Choose what feels urgent and how soon you want progress.",
                );
                return;
              }
              completeStep(route, "/onboarding/intake/major-goal");
            }}
          >
            <SingleSelectCardGroup
              value={onboarding.intake.urgentArea}
              options={URGENT_AREA_OPTIONS}
              onChange={(value) => setIntakeValues({ urgentArea: value })}
            />
            <InlineFollowupBlock title="How soon do you want to feel meaningful progress?">
              <SingleSelectCardGroup
                value={onboarding.intake.progressHorizon}
                options={PROGRESS_HORIZON_OPTIONS}
                onChange={(value) =>
                  setIntakeValues({ progressHorizon: value })
                }
              />
            </InlineFollowupBlock>
          </OnboardingScaffold>
        );

      case "/onboarding/intake/major-goal":
        return (
          <OnboardingScaffold
            sectionLabel="Your priorities"
            progressCurrent={3}
            progressTotal={13}
            title="Are you already working toward a major goal?"
            helperText="Major goals can change how the roadmap is paced."
            showBack
            onBackPress={() => goTo("/onboarding/intake/urgency-timeline")}
            primaryCtaLabel="Continue"
            onPrimaryPress={() => {
              if (onboarding.intake.hasMajorGoal == null) {
                showError(
                  "Tell us whether you’re already working toward a major goal.",
                );
                return;
              }
              if (
                onboarding.intake.hasMajorGoal &&
                (!onboarding.intake.majorGoalType ||
                  !onboarding.intake.majorGoalTiming)
              ) {
                showError("Choose the goal and rough timing.");
                return;
              }
              completeStep(route, "/onboarding/intake/monthly-stability");
            }}
          >
            <SingleSelectCardGroup
              value={
                onboarding.intake.hasMajorGoal == null
                  ? undefined
                  : onboarding.intake.hasMajorGoal
                    ? "yes"
                    : "no"
              }
              options={MAJOR_GOAL_OPTIONS}
              onChange={(value) =>
                setIntakeValues({
                  hasMajorGoal: value === "yes",
                  majorGoalType:
                    value === "yes"
                      ? onboarding.intake.majorGoalType
                      : undefined,
                  majorGoalTiming:
                    value === "yes"
                      ? onboarding.intake.majorGoalTiming
                      : undefined,
                })
              }
            />
            {onboarding.intake.hasMajorGoal ? (
              <InlineFollowupBlock title="What goal and on what timing?">
                <SingleSelectCardGroup
                  value={onboarding.intake.majorGoalType}
                  options={MAJOR_GOAL_TYPE_OPTIONS}
                  onChange={(value) =>
                    setIntakeValues({ majorGoalType: value })
                  }
                />
                <SingleSelectCardGroup
                  value={onboarding.intake.majorGoalTiming}
                  options={MAJOR_GOAL_TIMING_OPTIONS}
                  onChange={(value) =>
                    setIntakeValues({ majorGoalTiming: value })
                  }
                />
              </InlineFollowupBlock>
            ) : null}
          </OnboardingScaffold>
        );

      case "/onboarding/intake/monthly-stability":
        return (
          <OnboardingScaffold
            sectionLabel="Your finances today"
            progressCurrent={4}
            progressTotal={13}
            title="Which best describes your month-to-month situation?"
            helperText="This is one of the biggest inputs into where your roadmap should start."
            showBack
            onBackPress={() => goTo("/onboarding/intake/major-goal")}
            primaryCtaLabel="Continue"
            onPrimaryPress={() => {
              if (
                !onboarding.intake.monthlySituation ||
                !onboarding.intake.essentialsCoverage
              ) {
                showError(
                  "Choose both your monthly situation and essentials coverage.",
                );
                return;
              }
              completeStep(route, "/onboarding/intake/main-struggle");
            }}
          >
            <SingleSelectCardGroup
              value={onboarding.intake.monthlySituation}
              options={MONTHLY_SITUATION_OPTIONS}
              onChange={(value) => setIntakeValues({ monthlySituation: value })}
            />
            <InlineFollowupBlock title="Most months, does your income cover essential expenses?">
              <SingleSelectCardGroup
                value={onboarding.intake.essentialsCoverage}
                options={ESSENTIALS_COVERAGE_OPTIONS}
                onChange={(value) =>
                  setIntakeValues({ essentialsCoverage: value })
                }
              />
            </InlineFollowupBlock>
          </OnboardingScaffold>
        );

      case "/onboarding/intake/main-struggle":
        return (
          <OnboardingScaffold
            sectionLabel="Your finances today"
            progressCurrent={5}
            progressTotal={13}
            title="What has been hardest about managing your finances?"
            helperText="Choose up to 2. This helps us tailor the guidance, not just the numbers."
            showBack
            onBackPress={() => goTo("/onboarding/intake/monthly-stability")}
            primaryCtaLabel="Continue"
            onPrimaryPress={() => {
              const count = onboarding.intake.mainStruggles?.length ?? 0;
              if (count < 1 || count > 2) {
                showError("Choose up to 2 struggles.");
                return;
              }
              completeStep(route, "/onboarding/intake/past-attempts");
            }}
          >
            <MultiSelectChipGroup
              values={onboarding.intake.mainStruggles ?? []}
              options={MAIN_STRUGGLE_OPTIONS}
              maxSelections={2}
              onChange={(values) => setIntakeValues({ mainStruggles: values })}
            />
          </OnboardingScaffold>
        );

      case "/onboarding/intake/past-attempts":
        return (
          <OnboardingScaffold
            sectionLabel="Your finances today"
            progressCurrent={6}
            progressTotal={13}
            title="What have you tried before?"
            helperText="We want to understand what hasn’t worked, so your roadmap doesn’t repeat it."
            showBack
            onBackPress={() => goTo("/onboarding/intake/main-struggle")}
            primaryCtaLabel="Continue"
            onPrimaryPress={() => {
              const attempts = onboarding.intake.pastAttempts?.length ?? 0;
              const reasons =
                onboarding.intake.attemptWhyNotEnough?.length ?? 0;
              if (attempts < 1 || reasons < 1 || reasons > 2) {
                showError(
                  "Choose at least one past attempt and 1–2 reasons it did not work well enough.",
                );
                return;
              }
              completeStep(route, "/onboarding/intake/household");
            }}
          >
            <MultiSelectChipGroup
              values={onboarding.intake.pastAttempts ?? []}
              options={PAST_ATTEMPT_OPTIONS}
              onChange={(values) => setIntakeValues({ pastAttempts: values })}
            />
            <InlineFollowupBlock title="Why hasn’t that worked well enough?">
              <MultiSelectChipGroup
                values={onboarding.intake.attemptWhyNotEnough ?? []}
                options={ATTEMPT_REASON_OPTIONS}
                maxSelections={2}
                onChange={(values) =>
                  setIntakeValues({ attemptWhyNotEnough: values })
                }
              />
            </InlineFollowupBlock>
          </OnboardingScaffold>
        );

      case "/onboarding/intake/household":
        return (
          <OnboardingScaffold
            sectionLabel="Your situation"
            progressCurrent={7}
            progressTotal={13}
            title="Tell us a little about your household"
            helperText="Accounts show the numbers. These questions show the context around them."
            showBack
            onBackPress={() => goTo("/onboarding/intake/past-attempts")}
            primaryCtaLabel="Continue"
            onPrimaryPress={() => {
              if (
                !onboarding.intake.householdStatus ||
                !onboarding.intake.dependentsStatus
              ) {
                showError("Choose both household and dependents context.");
                return;
              }
              completeStep(route, "/onboarding/intake/housing");
            }}
          >
            <SingleSelectCardGroup
              value={onboarding.intake.householdStatus}
              options={HOUSEHOLD_OPTIONS}
              onChange={(value) => setIntakeValues({ householdStatus: value })}
            />
            <InlineFollowupBlock title="Do you support anyone financially?">
              <SingleSelectCardGroup
                value={onboarding.intake.dependentsStatus}
                options={DEPENDENTS_OPTIONS}
                onChange={(value) =>
                  setIntakeValues({ dependentsStatus: value })
                }
              />
            </InlineFollowupBlock>
          </OnboardingScaffold>
        );

      case "/onboarding/intake/housing":
        return (
          <OnboardingScaffold
            sectionLabel="Your situation"
            progressCurrent={8}
            progressTotal={13}
            title="What best describes your housing situation?"
            helperText="Housing is one of the biggest fixed parts of most financial plans."
            showBack
            onBackPress={() => goTo("/onboarding/intake/household")}
            primaryCtaLabel="Continue"
            onPrimaryPress={() => {
              if (!onboarding.intake.housingStatus) {
                showError("Choose your housing situation.");
                return;
              }
              completeStep(route, "/onboarding/intake/income-type");
            }}
          >
            <SingleSelectCardGroup
              value={onboarding.intake.housingStatus}
              options={HOUSING_OPTIONS}
              onChange={(value) => setIntakeValues({ housingStatus: value })}
            />
          </OnboardingScaffold>
        );

      case "/onboarding/intake/income-type": {
        const requiresPredictability = [
          "self_employed",
          "multiple_sources",
          "variable",
        ].includes(onboarding.intake.incomeType ?? "");
        return (
          <OnboardingScaffold
            sectionLabel="Your situation"
            progressCurrent={9}
            progressTotal={13}
            title="How do you earn most of your income?"
            helperText="Income stability changes how aggressive the roadmap should be."
            showBack
            onBackPress={() => goTo("/onboarding/intake/housing")}
            primaryCtaLabel="Continue"
            onPrimaryPress={() => {
              if (!onboarding.intake.incomeType) {
                showError("Choose how you earn most of your income.");
                return;
              }
              if (
                requiresPredictability &&
                !onboarding.intake.incomePredictability
              ) {
                showError(
                  "Tell us how predictable that income is month to month.",
                );
                return;
              }
              completeStep(route, "/onboarding/intake/employer-match");
            }}
          >
            <SingleSelectCardGroup
              value={onboarding.intake.incomeType}
              options={INCOME_TYPE_OPTIONS}
              onChange={(value) => {
                const nextRequiresPredictability = [
                  "self_employed",
                  "multiple_sources",
                  "variable",
                ].includes(value);
                return setIntakeValues({
                  incomeType: value,
                  incomePredictability: nextRequiresPredictability
                    ? onboarding.intake.incomePredictability
                    : undefined,
                });
              }}
            />
            {requiresPredictability ? (
              <InlineFollowupBlock title="How predictable is your income month to month?">
                <SingleSelectCardGroup
                  value={onboarding.intake.incomePredictability}
                  options={INCOME_PREDICTABILITY_OPTIONS}
                  onChange={(value) =>
                    setIntakeValues({ incomePredictability: value })
                  }
                />
              </InlineFollowupBlock>
            ) : null}
          </OnboardingScaffold>
        );
      }

      case "/onboarding/intake/employer-match":
        return (
          <OnboardingScaffold
            sectionLabel="Your situation"
            progressCurrent={10}
            progressTotal={13}
            title="Does your employer offer a retirement match?"
            helperText="This can change the order of what we recommend."
            showBack
            onBackPress={() => goTo("/onboarding/intake/income-type")}
            primaryCtaLabel="Continue"
            onPrimaryPress={() => {
              if (!onboarding.intake.employerMatch) {
                showError(
                  "Choose whether your employer offers a retirement match.",
                );
                return;
              }
              if (
                onboarding.intake.employerMatch === "yes" &&
                !onboarding.intake.fullMatchContribution
              ) {
                showError(
                  "Tell us whether you are contributing enough for the full match.",
                );
                return;
              }
              completeStep(route, "/onboarding/intake/upcoming-events");
            }}
          >
            <SingleSelectCardGroup
              value={onboarding.intake.employerMatch}
              options={EMPLOYER_MATCH_OPTIONS}
              onChange={(value) =>
                setIntakeValues({
                  employerMatch: value,
                  fullMatchContribution:
                    value === "yes"
                      ? onboarding.intake.fullMatchContribution
                      : undefined,
                })
              }
            />
            {onboarding.intake.employerMatch === "yes" ? (
              <InlineFollowupBlock title="Are you contributing enough to receive the full match?">
                <SingleSelectCardGroup
                  value={onboarding.intake.fullMatchContribution}
                  options={FULL_MATCH_OPTIONS}
                  onChange={(value) =>
                    setIntakeValues({ fullMatchContribution: value })
                  }
                />
              </InlineFollowupBlock>
            ) : null}
          </OnboardingScaffold>
        );

      case "/onboarding/intake/upcoming-events":
        return (
          <OnboardingScaffold
            sectionLabel="Your situation"
            progressCurrent={11}
            progressTotal={13}
            title="Do you expect any major life event or required expense in the next 1–3 years?"
            helperText="Upcoming events can affect savings targets and how we pace the roadmap."
            showBack
            onBackPress={() => goTo("/onboarding/intake/employer-match")}
            primaryCtaLabel="Continue"
            onPrimaryPress={() => {
              if ((onboarding.intake.upcomingEvents?.length ?? 0) < 1) {
                showError("Choose at least one upcoming event option.");
                return;
              }
              completeStep(route, "/onboarding/intake/guidance-style");
            }}
          >
            <MultiSelectChipGroup
              values={onboarding.intake.upcomingEvents ?? []}
              options={UPCOMING_EVENTS_OPTIONS}
              onChange={(values) => {
                const nextValues = values.includes("none")
                  ? ["none"]
                  : values.filter((value) => value !== "none");
                setIntakeValues({ upcomingEvents: nextValues });
              }}
            />
          </OnboardingScaffold>
        );

      case "/onboarding/intake/guidance-style":
        return (
          <OnboardingScaffold
            sectionLabel="How we guide you"
            progressCurrent={12}
            progressTotal={13}
            title="How do you want guidance to feel?"
            helperText="This changes how we present recommendations, especially when there are tradeoffs."
            showBack
            onBackPress={() => goTo("/onboarding/intake/upcoming-events")}
            primaryCtaLabel="Continue"
            onPrimaryPress={() => {
              if (
                !onboarding.intake.guidanceDirectness ||
                !onboarding.intake.pathPreference
              ) {
                showError(
                  "Choose how direct you want guidance to be and what matters more in tradeoffs.",
                );
                return;
              }
              completeStep(route, "/onboarding/intake/biggest-fear");
            }}
          >
            <SingleSelectCardGroup
              value={onboarding.intake.guidanceDirectness}
              options={GUIDANCE_DIRECTNESS_OPTIONS}
              onChange={(value) =>
                setIntakeValues({ guidanceDirectness: value })
              }
            />
            <InlineFollowupBlock title="When there are multiple reasonable paths, what matters more?">
              <SingleSelectCardGroup
                value={onboarding.intake.pathPreference}
                options={PATH_PREFERENCE_OPTIONS}
                onChange={(value) => setIntakeValues({ pathPreference: value })}
              />
            </InlineFollowupBlock>
          </OnboardingScaffold>
        );

      case "/onboarding/intake/biggest-fear":
        return (
          <OnboardingScaffold
            sectionLabel="How we guide you"
            progressCurrent={13}
            progressTotal={13}
            title="What are you most worried about getting wrong?"
            helperText="We’ll use this to decide where you need more explanation and reassurance."
            showBack
            onBackPress={() => goTo("/onboarding/intake/guidance-style")}
            primaryCtaLabel="Finish intake"
            onPrimaryPress={() => {
              if (!onboarding.intake.biggestFear) {
                showError("Choose what worries you most right now.");
                return;
              }
              markIntakeCompleted();
              completeStep(route, "/onboarding/intake-summary");
            }}
          >
            <SingleSelectCardGroup
              value={onboarding.intake.biggestFear}
              options={BIGGEST_FEAR_OPTIONS}
              onChange={(value) => setIntakeValues({ biggestFear: value })}
            />
          </OnboardingScaffold>
        );

      case "/onboarding/intake-summary":
        return (
          <OnboardingScaffold
            title="Here’s what we heard"
            helperText="Your roadmap will focus first on the moves most likely to improve stability, reduce financial drag, and support the goals you care about. To make that roadmap accurate, we need to assess your finances as a whole."
            showBack
            onBackPress={() => goTo("/onboarding/intake/biggest-fear")}
            primaryCtaLabel="Link accounts to build my roadmap"
            secondaryCtaLabel="Back and edit"
            onPrimaryPress={() => goTo("/onboarding/linking-why")}
            onSecondaryPress={() => goTo("/onboarding/intake/biggest-fear")}
          >
            <Text variant="labelMedium">Advisor intake complete</Text>
            <SummaryBulletCard bullets={summaryBullets} />
          </OnboardingScaffold>
        );

      case "/onboarding/linking-why":
        return (
          <OnboardingScaffold
            title="Link your accounts for an accurate roadmap"
            helperText="Your answers give us context. Your accounts show the full picture. The more complete your coverage, the more accurate and useful your guidance will be."
            showBack
            onBackPress={() => goTo("/onboarding/intake-summary")}
            primaryCtaLabel="Continue to account linking"
            secondaryCtaLabel="Back"
            onPrimaryPress={() => goTo("/onboarding/link-accounts")}
            onSecondaryPress={() => goTo("/onboarding/intake-summary")}
          >
            <Text variant="labelMedium">Build on real data</Text>
            <TrustBulletRow
              bullets={[
                "Read-only access",
                "Disconnect at any time",
                "We never sell your data",
              ]}
            />
            <AccountCategoryList
              items={[
                {
                  label: "Checking & savings",
                  purpose: "Used for cash flow and emergency fund guidance",
                  status: "Core",
                },
                {
                  label: "Credit cards & loans",
                  purpose: "Used for debt strategy and payoff sequencing",
                  status: "Recommended",
                },
                {
                  label: "Retirement & investments",
                  purpose: "Used for long-term planning",
                  status: "Recommended",
                },
                {
                  label: "Mortgage",
                  purpose: "Used for housing obligations and net worth",
                  status: "If applicable",
                },
              ]}
            />
          </OnboardingScaffold>
        );

      case "/onboarding/link-accounts":
        return (
          <OnboardingScaffold
            title="Connect your financial accounts"
            helperText="Best results come from linking your full financial picture in one session."
            showBack
            onBackPress={() => goTo("/onboarding/linking-why")}
            primaryCtaLabel={
              onboarding.linking.coreTransactionalLinked
                ? "Link another account"
                : "Link an account"
            }
            secondaryCtaLabel={
              onboarding.linking.coreTransactionalLinked
                ? "Continue with current coverage"
                : undefined
            }
            onPrimaryPress={handleLinkPrimary}
            onSecondaryPress={
              onboarding.linking.coreTransactionalLinked
                ? () => {
                    trackEvent("account_link_skipped_after_minimum");
                    goTo("/onboarding/generating-roadmap");
                  }
                : undefined
            }
            footerNote={
              onboarding.linking.coreTransactionalLinked
                ? "More linked accounts = more accurate guidance."
                : "Setup is complete once at least one core account is linked."
            }
          >
            <Text variant="labelMedium">Account linking</Text>
            <Text variant="bodySmall">
              To finish setup, link at least one core account with transaction
              history.
            </Text>
            <AccountCategoryList
              items={[
                {
                  label: "Checking & savings",
                  purpose: "Core",
                  status: "Core",
                  linked:
                    onboarding.linking.linkedCategories.includes(
                      "checking_savings",
                    ),
                },
                {
                  label: "Credit cards",
                  purpose: "Recommended",
                  status: "Recommended",
                  linked:
                    onboarding.linking.linkedCategories.includes(
                      "credit_cards",
                    ),
                },
                {
                  label: "Loans",
                  purpose: "Recommended",
                  status: "Recommended",
                  linked: onboarding.linking.linkedCategories.includes("loans"),
                },
                {
                  label: "Retirement & investments",
                  purpose: "Recommended",
                  status: "Recommended",
                  linked: onboarding.linking.linkedCategories.includes(
                    "retirement_investments",
                  ),
                },
                {
                  label: "Mortgage",
                  purpose: "If applicable",
                  status: "If applicable",
                  linked:
                    onboarding.linking.linkedCategories.includes("mortgage"),
                },
              ]}
            />
            <TrustBulletRow
              bullets={[
                "Read-only access",
                "Disconnect anytime",
                "We never sell your data",
              ]}
            />
          </OnboardingScaffold>
        );

      case "/onboarding/generating-roadmap":
        return (
          <OnboardingScaffold
            title="Reviewing your finances"
            helperText="This should only take a moment."
          >
            <Text variant="labelMedium">Building your roadmap</Text>
            <LoadingChecklist
              items={[...GENERATING_STEPS]}
              activeIndex={activeGenerationIndex}
            />
          </OnboardingScaffold>
        );

      case "/onboarding/roadmap-reveal": {
        if (!roadmapPayload) {
          return (
            <OnboardingScaffold
              title="We couldn’t load your roadmap yet"
              helperText="Please try generating it again."
              primaryCtaLabel="Try again"
              onPrimaryPress={() => goTo("/onboarding/generating-roadmap")}
            >
              <Text variant="bodyMedium">
                Your roadmap payload is not available yet.
              </Text>
            </OnboardingScaffold>
          );
        }

        const coverageLabel =
          roadmapPayload.overallCoverageLevel === "strong"
            ? "Coverage strong"
            : roadmapPayload.overallCoverageLevel === "preliminary"
              ? "Preliminary coverage"
              : "Coverage limited";

        return (
          <OnboardingScaffold
            title={roadmapPayload.currentStage.label}
            helperText={roadmapPayload.nextAction.rationale}
            primaryCtaLabel="See full roadmap"
            secondaryCtaLabel={
              roadmapPayload.overallCoverageLevel === "strong"
                ? "Manage linked accounts"
                : "Link more accounts"
            }
            onPrimaryPress={handleFinishOnboarding}
            onSecondaryPress={() => goTo("/onboarding/link-accounts")}
          >
            <RoadmapRevealHero
              coverageLabel={coverageLabel}
              title={`Your roadmap starts with ${roadmapPayload.currentStage.label}`}
              body={roadmapPayload.nextAction.recommendation}
              currentFocus={roadmapPayload.currentFocus.label}
              nextAction={roadmapPayload.nextAction.title}
              keyMetric={`${roadmapPayload.keyMetric.label} · ${roadmapPayload.keyMetric.value}`}
              coverageSummary={`Cash flow ${roadmapPayload.domainCoverage.cashflow} · Debt ${roadmapPayload.domainCoverage.debt} · Retirement ${roadmapPayload.domainCoverage.retirement}`}
              whyPlacedHere={roadmapPayload.explanation.whyPlacedHere}
            />
            {roadmapPayload.explanation.limitations.length > 0 ? (
              <SummaryBulletCard
                bullets={roadmapPayload.explanation.limitations}
              />
            ) : null}
          </OnboardingScaffold>
        );
      }

      default:
        return (
          <OnboardingScaffold
            title={`Unknown onboarding step`}
            helperText={`We could not resolve ${routeLabelFromPath(route)}.`}
            primaryCtaLabel="Start over"
            onPrimaryPress={() => goTo("/onboarding/welcome")}
          >
            <Text variant="bodyMedium">This route is not configured.</Text>
          </OnboardingScaffold>
        );
    }
  };

  return renderContent();
}
